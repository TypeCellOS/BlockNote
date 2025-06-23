import { Dictionary } from "../dictionary.js";

export const ko: Dictionary = {
  slash_menu: {
    heading: {
      title: "제목1",
      subtext: "섹션 제목(대)",
      aliases: ["h", "제목1", "h1", "대제목"],
      group: "제목",
    },
    heading_2: {
      title: "제목2",
      subtext: "섹션 제목(중)",
      aliases: ["h2", "제목2", "중제목"],
      group: "제목",
    },
    heading_3: {
      title: "제목3",
      subtext: "섹션 제목(소)",
      aliases: ["h3", "제목3", "subheading"],
      group: "제목",
    },
    heading_4: {
      title: "제목4",
      subtext: "하위 소단락 제목",
      aliases: ["h4", "제목4", "소제목4"],
      group: "소제목",
    },
    heading_5: {
      title: "제목5",
      subtext: "작은 하위 섹션 제목",
      aliases: ["h5", "제목5", "소제목5"],
      group: "소제목",
    },
    heading_6: {
      title: "제목6",
      subtext: "가장 하위 수준 제목",
      aliases: ["h6", "제목6", "소제목6"],
      group: "소제목",
    },
    toggle_heading: {
      title: "접을 수 있는 제목1",
      subtext: "내용을 표시하거나 숨길 수 있는 섹션 제목(대)",
      aliases: ["h", "제목1", "h1", "대제목", "접기", "토글"],
      group: "제목",
    },
    toggle_heading_2: {
      title: "접을 수 있는 제목2",
      subtext: "내용을 표시하거나 숨길 수 있는 섹션 제목(중)",
      aliases: ["h2", "제목2", "중제목", "접기", "토글"],
      group: "소제목",
    },
    toggle_heading_3: {
      title: "접을 수 있는 제목3",
      subtext: "내용을 표시하거나 숨길 수 있는 섹션 제목(소)",
      aliases: ["h3", "제목3", "subheading", "접기", "토글"],
      group: "소제목",
    },
    quote: {
      title: "인용",
      subtext: "인용문 또는 발췌",
      aliases: ["quotation", "blockquote", "bq"],
      group: "기본 블록",
    },
    numbered_list: {
      title: "번호 매기기 목록",
      subtext: "번호가 매겨진 목록을 추가합니다.",
      aliases: ["ol", "li", "목록", "번호 매기기 목록", "번호 목록"],
      group: "기본 블록",
    },
    bullet_list: {
      title: "글머리 기호 목록",
      subtext: "간단한 글머리 기호를 추가합니다.",
      aliases: ["ul", "li", "목록", "글머리 기호 목록", "글머리 목록"],
      group: "기본 블록",
    },
    check_list: {
      title: "체크리스트",
      subtext: "체크박스가 있는 목록을 표시하는 데 사용",
      aliases: [
        "ul",
        "li",
        "목록",
        "체크리스트",
        "체크 리스트",
        "체크된 목록",
        "체크박스",
      ],
      group: "기본 블록",
    },
    toggle_list: {
      title: "접을 수 있는 목록",
      subtext: "숨길 수 있는 하위 항목이 있는 목록",
      aliases: ["li", "목록", "접을 수 있는 목록", "토글 목록", "접기 목록"],
      group: "기본 블록",
    },
    paragraph: {
      title: "본문",
      subtext: "일반 텍스트",
      aliases: ["p", "paragraph", "본문"],
      group: "기본 블록",
    },
    code_block: {
      title: "코드 블록",
      subtext: "구문 강조가 있는 코드 블록",
      aliases: ["code", "pre"],
      group: "기본 블록",
    },
    page_break: {
      title: "페이지 나누기",
      subtext: "페이지 구분자",
      aliases: ["page", "break", "separator", "페이지", "구분자"],
      group: "기본 블록",
    },
    table: {
      title: "표",
      subtext: "간단한 표를 추가합니다.",
      aliases: ["표"],
      group: "고급",
    },
    image: {
      title: "이미지",
      subtext: "이미지 파일을 업로드합니다.",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "이미지",
        "url",
      ],
      group: "미디어",
    },
    video: {
      title: "비디오",
      subtext: "비디오 삽입",
      aliases: [
        "video",
        "videoUpload",
        "upload",
        "mp4",
        "film",
        "media",
        "동영상",
        "url",
      ],
      group: "미디어",
    },
    audio: {
      title: "오디오",
      subtext: "오디오 삽입",
      aliases: [
        "audio",
        "audioUpload",
        "upload",
        "mp3",
        "sound",
        "media",
        "오디오",
        "url",
      ],
      group: "미디어",
    },
    file: {
      title: "파일",
      subtext: "파일 삽입",
      aliases: ["file", "upload", "embed", "media", "파일", "url"],
      group: "미디어",
    },
    emoji: {
      title: "이모지",
      subtext: "이모지 삽입용으로 사용됩니다",
      aliases: [
        "이모지",
        "emoji",
        "감정 표현",
        "emotion expression",
        "표정",
        "face expression",
        "얼굴",
        "face",
      ],
      group: "기타",
    },
  },
  placeholders: {
    default: "텍스트를 입력하거나 /를 입력하여 명령을 입력하세요.",
    heading: "제목",
    toggleListItem: "토글",
    bulletListItem: "목록",
    numberedListItem: "목록",
    checkListItem: "목록",
    new_comment: "댓글 작성...",
    edit_comment: "댓글 수정...",
    comment_reply: "댓글 추가...",
  },
  file_blocks: {
    image: {
      add_button_text: "이미지 추가",
    },
    video: {
      add_button_text: "비디오 추가",
    },
    audio: {
      add_button_text: "오디오 추가",
    },
    file: {
      add_button_text: "파일 추가",
    },
  },
  // from react package:
  side_menu: {
    add_block_label: "블록 추가",
    drag_handle_label: "블록 메뉴 열기",
  },
  drag_handle: {
    delete_menuitem: "삭제",
    colors_menuitem: "색깔",
    header_row_menuitem: "행 제목",
    header_column_menuitem: "열 제목",
  },
  table_handle: {
    delete_column_menuitem: "열 1개 삭제",
    delete_row_menuitem: "행 삭제",
    add_left_menuitem: "왼쪽에 열 1개 추가",
    add_right_menuitem: "오른쪽에 열 1개 추가",
    add_above_menuitem: "위에 행 1개 추가",
    add_below_menuitem: "아래에 행 1개 추가",
    split_cell_menuitem: "셀 분할",
    merge_cells_menuitem: "셀 병합",
    background_color_menuitem: "배경색 변경",
  },
  suggestion_menu: {
    no_items_title: "항목을 찾을 수 없음",
  },
  color_picker: {
    text_title: "텍스트",
    background_title: "배경",
    colors: {
      default: "기본",
      gray: "회색",
      brown: "갈색",
      red: "빨간색",
      orange: "주황색",
      yellow: "노란색",
      green: "녹색",
      blue: "파란색",
      purple: "보라색",
      pink: "분홍색",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "진하게",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "기울임",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "밑줄",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "취소선",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "코드",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "색깔",
    },
    link: {
      tooltip: "링크 만들기",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "이미지 캡션 수정",
      input_placeholder: "이미지 캡션 수정",
    },
    file_replace: {
      tooltip: {
        image: "이미지 교체",
        video: "비디오 교체",
        audio: "오디오 교체",
        file: "파일 교체",
      },
    },
    file_rename: {
      tooltip: {
        image: "이미지 이름 변경",
        video: "비디오 이름 변경",
        audio: "오디오 이름 변경",
        file: "파일 이름 변경",
      },
      input_placeholder: {
        image: "이미지 이름 변경",
        video: "비디오 이름 변경",
        audio: "오디오 이름 변경",
        file: "파일 이름 변경",
      },
    },
    file_download: {
      tooltip: {
        image: "이미지 다운로드",
        video: "비디오 다운로드",
        audio: "오디오 다운로드",
        file: "파일 다운로드",
      },
    },
    file_delete: {
      tooltip: {
        image: "이미지 삭제",
        video: "비디오 삭제",
        audio: "오디오 삭제",
        file: "파일 삭제",
      },
    },
    file_preview_toggle: {
      tooltip: "미리보기 전환",
    },
    nest: {
      tooltip: "중첩 블록",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "비중첩 블록",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "텍스트 왼쪽 맞춤",
    },
    align_center: {
      tooltip: "텍스트 가운데 맞춤",
    },
    align_right: {
      tooltip: "텍스트 오른쪽 맞춤",
    },
    align_justify: {
      tooltip: "텍스트 양쪽 맞춤",
    },
    table_cell_merge: {
      tooltip: "셀 병합",
    },
    comment: {
      tooltip: "코멘트 추가",
    },
  },
  file_panel: {
    upload: {
      title: "업로드",
      file_placeholder: {
        image: "이미지 업로드",
        video: "비디오 업로드",
        audio: "오디오 업로드",
        file: "파일 업로드",
      },
      upload_error: "오류: 업로드 실패",
    },
    embed: {
      title: "임베드",
      embed_button: {
        image: "이미지 삽입",
        video: "비디오 삽입",
        audio: "오디오 삽입",
        file: "파일 삽입",
      },
      url_placeholder: "URL을 입력하세요.",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "링크 삭제",
    },
    edit: {
      text: "링크 수정",
      tooltip: "수정",
    },
    open: {
      tooltip: "새 탭으로 열기",
    },
    form: {
      title_placeholder: "제목 수정",
      url_placeholder: "URL 수정",
    },
  },
  comments: {
    edited: "수정됨",
    save_button_text: "저장",
    cancel_button_text: "취소",
    actions: {
      add_reaction: "반응 추가",
      resolve: "해결",
      edit_comment: "댓글 수정",
      delete_comment: "댓글 삭제",
      more_actions: "더 많은 작업",
    },
    reactions: {
      reacted_by: "반응한 사람",
    },
    sidebar: {
      marked_as_resolved: "해결됨으로 표시됨",
      more_replies: (count) => `${count}개의 추가 답글`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
