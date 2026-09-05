//! Minimal wasm binding over the official `typst` crates for BlockNote's PDF
//! export: an in-memory `World` (main source + asset files), fonts supplied as
//! bytes, and native PDF-standards support (`ua-1`) via `typst-pdf`.
//!
//! Deliberately excluded: package registry (BlockNote's generated markup
//! imports no packages), incremental rendering, SVG/vector output, system
//! font access, network access of any kind.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use typst::diag::{FileError, FileResult, SourceDiagnostic};
use typst::foundations::{Bytes, Datetime, Duration};
use typst::syntax::{DiagSpanKind, FileId, RootedPath, Source, VirtualPath, VirtualRoot};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World};
use typst_layout::PagedDocument;
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards};
use wasm_bindgen::prelude::*;

/// An immutable in-memory world for a single compilation.
struct BnWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    fonts: Vec<Font>,
    main: Source,
    /// Additional `.typ` sources (imports), interned by path.
    sources: HashMap<FileId, Source>,
    files: HashMap<FileId, Bytes>,
}

impl World for BnWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }

    fn main(&self) -> FileId {
        self.main.id()
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.main.id() {
            Ok(self.main.clone())
        } else {
            self.sources
                .get(&id)
                .cloned()
                .ok_or_else(|| FileError::NotFound(id.vpath().as_rooted_path().into()))
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        self.files
            .get(&id)
            .cloned()
            .ok_or_else(|| FileError::NotFound(id.vpath().as_rooted_path().into()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, _offset: Option<Duration>) -> Option<Datetime> {
        // Deterministic output: no wall clock in the sandbox. Documents using
        // `datetime.today()` get no date rather than a nondeterministic one.
        None
    }
}

/// Options for a single PDF compilation, mirroring `typst-pdf`'s knobs that
/// BlockNote needs. camelCase to match the JS caller.
#[derive(Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct CompileOptions {
    /// A PDF standard to enforce, e.g. "ua-1". Enforcement includes typst's
    /// compile-time validation; failures come back as diagnostics.
    #[serde(default)]
    pdf_standard: Option<PdfStandard>,
    /// Emit the tagged (accessible) structure tree. typst's default is true.
    #[serde(default)]
    tagged: Option<bool>,
    /// PDF creation timestamp in seconds since the Unix epoch (UTC). Pass a
    /// fixed value for byte-reproducible output; omitted means no timestamp.
    #[serde(default)]
    creation_timestamp: Option<i64>,
}

/// One diagnostic, serialized to JS. Whether it is an error or a warning
/// is expressed by which list it arrives in (`compileErrors` /
/// `compileWarnings`), not by a field. `message` keeps typst's original
/// text, including the "PDF/UA-1 error:" prefix on validation errors, so
/// callers can distinguish conformance failures from genuine compile
/// errors.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct JsDiagnostic {
    message: String,
    hints: Vec<String>,
    /// Byte range in the main source, when the span points there.
    range: Option<(usize, usize)>,
}

fn to_js_diags(main: &Source, diags: &[SourceDiagnostic]) -> Vec<JsDiagnostic> {
    diags
        .iter()
        .map(|d| JsDiagnostic {
            message: d.message.to_string(),
            hints: d.hints.iter().map(|h| h.v.to_string()).collect(),
            range: diag_range(main, d.span),
        })
        .collect()
}

/// Resolve a diagnostic's span to a byte range in the main source.
fn diag_range(main: &Source, span: typst::syntax::DiagSpan) -> Option<(usize, usize)> {
    match span.get() {
        DiagSpanKind::Number { id, num, sub_range } if id == main.id() => {
            main.range(num, sub_range).map(|r| (r.start, r.end))
        }
        DiagSpanKind::Range { id, range } if id == main.id() => {
            Some((range.start, range.end))
        }
        _ => None,
    }
}

/// The uniform result payload: `pdf` present on success, and both
/// diagnostic lists always present (empty when there is nothing to say).
/// Compile failure is an expected outcome, so it is *returned*, never
/// thrown - `Err` is reserved for caller mistakes (invalid options).
fn compile_result(
    main: &Source,
    pdf: Option<&[u8]>,
    errors: &[SourceDiagnostic],
    warnings: &[SourceDiagnostic],
) -> JsValue {
    let result = js_sys::Object::new();
    if let Some(pdf) = pdf {
        js_sys::Reflect::set(
            &result,
            &"pdf".into(),
            &js_sys::Uint8Array::from(pdf).into(),
        )
        .expect("plain object set");
    }
    for (key, diags) in [("compileErrors", errors), ("compileWarnings", warnings)] {
        js_sys::Reflect::set(
            &result,
            &key.into(),
            &serde_wasm_bindgen::to_value(&to_js_diags(main, diags))
                .expect("diagnostics serialize"),
        )
        .expect("plain object set");
    }
    result.into()
}

/// The compiler: owns the loaded fonts (the expensive, reusable part).
/// Each `compile_pdf` call builds a fresh world, so instances are cheap to
/// keep and there is no page-level singleton.
#[wasm_bindgen]
pub struct TypstCompiler {
    fonts: Vec<Font>,
    font_hashes: std::collections::HashSet<u64>,
    library: LazyHash<Library>,
}

#[wasm_bindgen]
impl TypstCompiler {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TypstCompiler {
        console_error_panic_hook::set_once();
        TypstCompiler {
            fonts: Vec::new(),
            font_hashes: std::collections::HashSet::new(),
            library: LazyHash::new(Library::default()),
        }
    }

    /// Load every face of a font file (TTF/OTF/TTC). Byte-identical files
    /// are deduplicated (repeat loads are no-ops).
    /// Returns the number of faces added; 0 means the bytes were not a font
    /// (or were already loaded).
    pub fn add_font(&mut self, data: &[u8]) -> u32 {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        data.hash(&mut hasher);
        if !self.font_hashes.insert(hasher.finish()) {
            return 0;
        }
        let bytes = Bytes::new(data.to_vec());
        let mut added = 0u32;
        // Collections hold multiple faces; probe indices until one fails.
        for index in 0..64 {
            match Font::new(bytes.clone(), index) {
                Some(font) => {
                    self.fonts.push(font);
                    added += 1;
                }
                None => break,
            }
        }
        added
    }

    /// The family names of the loaded fonts, in load order (deduplicated) -
    /// what the Typst source can reference in `#set text(font: ...)`.
    pub fn font_families(&self) -> Vec<String> {
        let mut seen = std::collections::HashSet::new();
        self.fonts
            .iter()
            .map(|f| f.info().family.to_string())
            .filter(|name| seen.insert(name.clone()))
            .collect()
    }

    /// Compile Typst markup to PDF bytes.
    ///
    /// `asset_paths[i]` (an absolute virtual path like "/assets/img0.png")
    /// names the file whose bytes are `asset_data[i]`.
    ///
    /// On failure the error is `{ diagnostics: [...] }`; PDF-standard
    /// validation failures are diagnostics whose message starts with the
    /// validator prefix (e.g. "PDF/UA-1 error:").
    pub fn compile_pdf(
        &self,
        main_source: &str,
        asset_paths: Vec<String>,
        asset_data: Vec<js_sys::Uint8Array>,
        options: JsValue,
    ) -> Result<JsValue, JsValue> {
        let options: CompileOptions = if options.is_undefined() || options.is_null() {
            CompileOptions::default()
        } else {
            serde_wasm_bindgen::from_value(options)
                .map_err(|e| JsValue::from_str(&format!("invalid options: {e}")))?
        };

        if asset_paths.len() != asset_data.len() {
            return Err(JsValue::from_str("asset_paths/asset_data length mismatch"));
        }
        let mut files = HashMap::new();
        let mut sources = HashMap::new();
        for (path, data) in asset_paths.into_iter().zip(asset_data) {
            let id = project_file(&path)?;
            if path.ends_with(".typ") {
                // Importable source files must be registered as sources, not
                // raw bytes, so `#import` finds them.
                let text = String::from_utf8(data.to_vec()).map_err(|_| {
                    JsValue::from_str(&format!("{path}: .typ files must be UTF-8"))
                })?;
                sources.insert(id, Source::new(id, text));
            } else {
                files.insert(id, Bytes::new(data.to_vec()));
            }
        }

        let world = BnWorld {
            library: self.library.clone(),
            book: LazyHash::new(FontBook::from_fonts(&self.fonts)),
            fonts: self.fonts.clone(),
            main: Source::new(
                project_file("/main.typ").expect("static path is valid"),
                main_source.to_string(),
            ),
            sources,
            files,
        };

        let compiled = typst::compile::<PagedDocument>(&world);
        let document = match compiled.output {
            Ok(document) => document,
            Err(errors) => {
                return Ok(compile_result(
                    &world.main,
                    None,
                    &errors,
                    &compiled.warnings,
                ));
            }
        };

        let standards = match options.pdf_standard {
            Some(standard) => PdfStandards::new(&[standard])
                .map_err(|e| JsValue::from_str(&format!("invalid PDF standard: {}", e.message())))?,
            None => PdfStandards::default(),
        };
        let pdf_options = PdfOptions {
            standards,
            tagged: options.tagged.unwrap_or(true),
            timestamp: options
                .creation_timestamp
                .and_then(unix_seconds_to_datetime)
                .map(typst_pdf::Timestamp::new_utc),
            ..Default::default()
        };
        let pdf = match typst_pdf::pdf(&document, &pdf_options) {
            Ok(pdf) => pdf,
            Err(errors) => {
                return Ok(compile_result(
                    &world.main,
                    None,
                    &errors,
                    &compiled.warnings,
                ));
            }
        };
        Ok(compile_result(
            &world.main,
            Some(&pdf),
            &[],
            &compiled.warnings,
        ))
    }
}

/// Civil-from-days (Howard Hinnant's algorithm): Unix seconds -> Datetime.
/// Deterministic and dependency-free; returns `None` outside Datetime's
/// supported range.
fn unix_seconds_to_datetime(seconds: i64) -> Option<Datetime> {
    let days = seconds.div_euclid(86_400);
    let secs_of_day = seconds.rem_euclid(86_400);
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    Datetime::from_ymd_hms(
        i32::try_from(y).ok()?,
        u8::try_from(m).ok()?,
        u8::try_from(d).ok()?,
        u8::try_from(secs_of_day / 3600).ok()?,
        u8::try_from((secs_of_day % 3600) / 60).ok()?,
        u8::try_from(secs_of_day % 60).ok()?,
    )
}

/// Interns an absolute virtual path in the project root.
fn project_file(path: &str) -> Result<FileId, JsValue> {
    let vpath = VirtualPath::new(path)
        .map_err(|e| JsValue::from_str(&format!("invalid path {path:?}: {e}")))?;
    Ok(FileId::new(RootedPath::new(VirtualRoot::Project, vpath)))
}
