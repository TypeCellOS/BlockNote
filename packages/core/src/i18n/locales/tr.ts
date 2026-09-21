export const tr = {
  locale: "tr",
  slash_menu: {
    heading: {
      title: "Başlık 1",
      subtext: "Üst düzey başlık",
      aliases: ["h", "başlık1", "h1"],
      group: "Başlıklar",
    },
    heading_2: {
      title: "Başlık 2",
      subtext: "Ana bölüm başlığı",
      aliases: ["h2", "başlık2", "altbaşlık"],
      group: "Başlıklar",
    },
    heading_3: {
      title: "Başlık 3",
      subtext: "Alt bölüm ve grup başlığı",
      aliases: ["h3", "başlık3", "altbaşlık"],
      group: "Başlıklar",
    },
    heading_4: {
      title: "Başlık 4",
      subtext: "Küçük alt bölüm başlığı",
      aliases: ["h4", "başlık4", "altbaşlık4"],
      group: "Alt Başlıklar",
    },
    heading_5: {
      title: "Başlık 5",
      subtext: "Küçük alt bölüm başlığı",
      aliases: ["h5", "başlık5", "altbaşlık5"],
      group: "Alt Başlıklar",
    },
    heading_6: {
      title: "Başlık 6",
      subtext: "En alt düzey başlık",
      aliases: ["h6", "başlık6", "altbaşlık6"],
      group: "Alt Başlıklar",
    },
    toggle_heading: {
      title: "Açılır Başlık 1",
      subtext: "Açılıp kapanabilen üst düzey başlık",
      aliases: ["h", "başlık1", "h1", "katlanabilir"],
      group: "Alt Başlıklar",
    },
    toggle_heading_2: {
      title: "Açılır Başlık 2",
      subtext: "Açılıp kapanabilen ana bölüm başlığı",
      aliases: ["h2", "başlık2", "altbaşlık", "katlanabilir"],
      group: "Alt Başlıklar",
    },
    toggle_heading_3: {
      title: "Açılır Başlık 3",
      subtext: "Açılıp kapanabilen alt bölüm başlığı",
      aliases: ["h3", "başlık3", "altbaşlık", "katlanabilir"],
      group: "Alt Başlıklar",
    },
    quote: {
      title: "Alıntı",
      subtext: "Alıntı veya aktarma",
      aliases: ["alıntı", "blockquote", "bq"],
      group: "Temel bloklar",
    },
    toggle_list: {
      title: "Açılır Liste",
      subtext: "Gizlenebilir alt öğelerle liste",
      aliases: [
        "li",
        "liste",
        "açılırliste",
        "açılır liste",
        "katlanabilir liste",
      ],
      group: "Temel bloklar",
    },
    numbered_list: {
      title: "Numaralı Liste",
      subtext: "Sıralı öğelerle liste",
      aliases: ["ol", "li", "liste", "numaralıliste", "numaralı liste"],
      group: "Temel bloklar",
    },
    bullet_list: {
      title: "Madde İşaretli Liste",
      subtext: "Sırasız öğelerle liste",
      aliases: [
        "ul",
        "li",
        "liste",
        "maddeişaretliliste",
        "madde işaretli liste",
      ],
      group: "Temel bloklar",
    },
    check_list: {
      title: "Kontrol Listesi",
      subtext: "Onay kutularıyla liste",
      aliases: [
        "ul",
        "li",
        "liste",
        "kontrolliste",
        "kontrol listesi",
        "işaretli liste",
        "checkbox",
      ],
      group: "Temel bloklar",
    },
    paragraph: {
      title: "Paragraf",
      subtext: "Belgenizin gövdesi",
      aliases: ["p", "paragraf"],
      group: "Temel bloklar",
    },
    code_block: {
      title: "Kod Bloğu",
      subtext: "Söz dizimi vurgulamalı kod bloğu",
      aliases: ["kod", "pre"],
      group: "Temel bloklar",
    },
    page_break: {
      title: "Sayfa Sonu",
      subtext: "Sayfa ayırıcı",
      aliases: ["sayfa", "son", "ayırıcı"],
      group: "Temel bloklar",
    },
    table: {
      title: "Tablo",
      subtext: "Düzenlenebilir hücreleri olan tablo",
      aliases: ["tablo"],
      group: "Gelişmiş",
    },
    image: {
      title: "Görsel",
      subtext: "Boyutlandırılabilir ve açıklamalı görsel",
      aliases: [
        "görsel",
        "görselYükleme",
        "yükleme",
        "img",
        "resim",
        "medya",
        "url",
      ],
      group: "Medya",
    },
    video: {
      title: "Video",
      subtext: "Boyutlandırılabilir ve açıklamalı video",
      aliases: [
        "video",
        "videoYükleme",
        "yükleme",
        "mp4",
        "film",
        "medya",
        "url",
      ],
      group: "Medya",
    },
    audio: {
      title: "Ses",
      subtext: "Açıklamalı gömülü ses",
      aliases: ["ses", "sesYükleme", "yükleme", "mp3", "ses", "medya", "url"],
      group: "Medya",
    },
    file: {
      title: "Dosya",
      subtext: "Gömülü dosya",
      aliases: ["dosya", "yükleme", "göm", "medya", "url"],
      group: "Medya",
    },
    emoji: {
      title: "Emoji",
      subtext: "Emoji arayın ve ekleyin",
      aliases: ["emoji", "ifade", "duygu", "yüz"],
      group: "Diğer",
    },
    divider: {
      title: "Ayırıcı",
      subtext: "Blokları görsel olarak böler",
      aliases: ["ayırıcı", "hr", "çizgi", "yatay çizgi"],
      group: "Temel bloklar",
    },
  },
  placeholders: {
    default: "Metin girin veya komutlar için '/' yazın",
    heading: "Başlık",
    toggleListItem: "Aç/Kapat",
    bulletListItem: "Liste",
    numberedListItem: "Liste",
    checkListItem: "Liste",
    emptyDocument: undefined,
    new_comment: "Bir yorum yazın...",
    edit_comment: "Yorumu düzenle...",
    comment_reply: "Yorum ekle...",
  } as Record<string, string | undefined>,
  file_blocks: {
    add_button_text: {
      image: "Görsel ekle",
      video: "Video ekle",
      audio: "Ses ekle",
      file: "Dosya ekle",
    } as Record<string, string>,
  },
  toggle_blocks: {
    add_block_button: "Boş açılır blok. Blok eklemek için tıklayın.",
  },
  side_menu: {
    add_block_label: "Blok ekle",
    drag_handle_label: "Blok menüsünü aç",
  },
  drag_handle: {
    delete_menuitem: "Sil",
    colors_menuitem: "Renkler",
    header_row_menuitem: "Başlık satırı",
    header_column_menuitem: "Başlık sütunu",
  },
  table_handle: {
    delete_column_menuitem: "Sütunu sil",
    delete_row_menuitem: "Satırı sil",
    add_left_menuitem: "Sola sütun ekle",
    add_right_menuitem: "Sağa sütun ekle",
    add_above_menuitem: "Üste satır ekle",
    add_below_menuitem: "Alta satır ekle",
    split_cell_menuitem: "Hücreyi böl",
    merge_cells_menuitem: "Hücreleri birleştir",
    background_color_menuitem: "Arka plan rengi",
  },
  suggestion_menu: {
    no_items_title: "Öğe bulunamadı",
  },
  color_picker: {
    text_title: "Metin",
    background_title: "Arka plan",
    colors: {
      default: "Otomatik",
      gray: "Gri",
      brown: "Kahverengi",
      red: "Kırmızı",
      orange: "Turuncu",
      yellow: "Sarı",
      green: "Yeşil",
      blue: "Mavi",
      purple: "Mor",
      pink: "Pembe",
    },
  },
  formatting_toolbar: {
    bold: {
      tooltip: "Kalın",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "İtalik",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Altı çizili",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Üstü çizili",
      secondary_tooltip: "Mod+Shift+S",
    },
    code: {
      tooltip: "Kod",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Renkler",
    },
    link: {
      tooltip: "Bağlantı oluştur",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Açıklamayı düzenle",
      input_placeholder: "Açıklamayı düzenle",
    },
    file_replace: {
      tooltip: {
        image: "Görseli değiştir",
        video: "Videoyu değiştir",
        audio: "Sesi değiştir",
        file: "Dosyayı değiştir",
      } as Record<string, string>,
    },
    file_rename: {
      tooltip: {
        image: "Görseli yeniden adlandır",
        video: "Videoyu yeniden adlandır",
        audio: "Sesi yeniden adlandır",
        file: "Dosyayı yeniden adlandır",
      } as Record<string, string>,
      input_placeholder: {
        image: "Görseli yeniden adlandır",
        video: "Videoyu yeniden adlandır",
        audio: "Sesi yeniden adlandır",
        file: "Dosyayı yeniden adlandır",
      } as Record<string, string>,
    },
    file_download: {
      tooltip: {
        image: "Görseli indir",
        video: "Videoyu indir",
        audio: "Sesi indir",
        file: "Dosyayı indir",
      } as Record<string, string>,
    },
    file_delete: {
      tooltip: {
        image: "Görseli sil",
        video: "Videoyu sil",
        audio: "Sesi sil",
        file: "Dosyayı sil",
      } as Record<string, string>,
    },
    file_preview_toggle: {
      tooltip: "Önizlemeyi aç/kapat",
    },
    nest: {
      tooltip: "Bloğu iç içe yerleştir",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "İç içe yerleştirmeyi kaldır",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Sola hizala",
    },
    align_center: {
      tooltip: "Ortaya hizala",
    },
    align_right: {
      tooltip: "Sağa hizala",
    },
    align_justify: {
      tooltip: "İki yana yasla",
    },
    table_cell_merge: {
      tooltip: "Hücreleri birleştir",
    },
    comment: {
      tooltip: "Yorum ekle",
    },
  },
  file_panel: {
    upload: {
      title: "Yükle",
      file_placeholder: {
        image: "Görsel yükle",
        video: "Video yükle",
        audio: "Ses yükle",
        file: "Dosya yükle",
      } as Record<string, string>,
      upload_error: "Hata: Yükleme başarısız oldu",
    },
    embed: {
      title: "Göm",
      embed_button: {
        image: "Görsel göm",
        video: "Video göm",
        audio: "Ses göm",
        file: "Dosya göm",
      } as Record<string, string>,
      url_placeholder: "URL girin",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Bağlantıyı kaldır",
    },
    edit: {
      text: "Bağlantıyı düzenle",
      tooltip: "Düzenle",
    },
    open: {
      tooltip: "Yeni sekmede aç",
    },
    form: {
      title_placeholder: "Başlığı düzenle",
      url_placeholder: "URL düzenle",
    },
  },
  comments: {
    edited: "düzenlendi",
    save_button_text: "Kaydet",
    cancel_button_text: "İptal",
    deleted_reference_text: "Orijinal içerik silindi",
    discard_pending_comment: "Bu yorumu silmek istediğinizden emin misiniz?",
    actions: {
      add_reaction: "Tepki ekle",
      resolve: "Çözüldü",
      reopen: "Yeniden aç",
      edit_comment: "Yorumu düzenle",
      delete_comment: "Yorumu sil",
      more_actions: "Diğer işlemler",
    },
    reactions: {
      reacted_by: "Tepki veren",
    },
    sidebar: {
      marked_as_resolved: "Çözüldü olarak işaretlendi",
      more_replies: (count: number) => `${count} yanıt daha`,
    },
  },
  suggestion_changes: {
    formatting_change: "Biçimlendirme Değişikliği",
    deleted: "Silindi",
    inserted_by: (users: string) => `Ekleyen: ${users}`,
    deleted_by: (users: string) => `Silen: ${users}`,
    formatting_change_by: (formats: string, users: string) =>
      `Biçimlendirme değişikliği (${formats}): ${users}`,
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
