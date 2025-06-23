import type { Dictionary } from "../dictionary.js";

export const vi: Dictionary = {
  slash_menu: {
    heading: {
      title: "Tiêu đề H1",
      subtext: "Sử dụng cho tiêu đề cấp cao nhất",
      aliases: ["h", "tieude1", "dd1"],
      group: "Tiêu đề",
    },
    heading_2: {
      title: "Tiêu đề H2",
      subtext: "Sử dụng cho các phần chính",
      aliases: ["h2", "tieude2", "tieudephu"],
      group: "Tiêu đề",
    },
    heading_3: {
      title: "Tiêu đề H3",
      subtext: "Sử dụng cho phụ đề và tiêu đề nhóm",
      aliases: ["h3", "tieude3", "tieudephu"],
      group: "Tiêu đề",
    },
    heading_4: {
      title: "Tiêu đề H4",
      subtext: "Sử dụng cho tiêu đề phụ nhỏ hơn",
      aliases: ["h4", "tieude4", "tieudephu4"],
      group: "Tiêu đề phụ",
    },
    heading_5: {
      title: "Tiêu đề H5",
      subtext: "Sử dụng cho tiêu đề phụ nhỏ hơn",
      aliases: ["h5", "tieude5", "tieudephu5"],
      group: "Tiêu đề phụ",
    },
    heading_6: {
      title: "Tiêu đề H6",
      subtext: "Sử dụng cho tiêu đề cấp thấp nhất",
      aliases: ["h6", "tieude6", "tieudephu6"],
      group: "Tiêu đề phụ",
    },
    toggle_heading: {
      title: "Tiêu đề có thể thu gọn H1",
      subtext: "Tiêu đề cấp cao nhất có thể thu gọn",
      aliases: ["h", "tieude1", "dd1", "thugon"],
      group: "Tiêu đề phụ",
    },
    toggle_heading_2: {
      title: "Tiêu đề có thể thu gọn H2",
      subtext: "Tiêu đề cho các phần chính có thể thu gọn",
      aliases: ["h2", "tieude2", "tieudephu", "thugon"],
      group: "Tiêu đề phụ",
    },
    toggle_heading_3: {
      title: "Tiêu đề có thể thu gọn H3",
      subtext: "Tiêu đề cho phụ đề và tiêu đề nhóm có thể thu gọn",
      aliases: ["h3", "tieude3", "tieudephu", "thugon"],
      group: "Tiêu đề phụ",
    },
    quote: {
      title: "Trích dẫn",
      subtext: "Trích dẫn hoặc đoạn trích",
      aliases: ["quotation", "blockquote", "bq"],
      group: "Khối cơ bản",
    },
    numbered_list: {
      title: "Danh sách đánh số",
      subtext: "Sử dụng để hiển thị danh sách có đánh số",
      aliases: ["ol", "li", "ds", "danhsachdso", "danh sach danh so"],
      group: "Khối cơ bản",
    },
    bullet_list: {
      title: "Danh sách",
      subtext: "Sử dụng để hiển thị danh sách không đánh số",
      aliases: ["ul", "li", "ds", "danhsach", "danh sach"],
      group: "Khối cơ bản",
    },
    check_list: {
      title: "Danh sách kiểm tra",
      subtext: "Dùng để hiển thị danh sách có hộp kiểm",
      aliases: [
        "ul",
        "li",
        "danh sach",
        "danh sach kiem tra",
        "danh sach da kiem tra",
        "hop kiem",
      ],
      group: "Khối cơ bản",
    },
    toggle_list: {
      title: "Danh sách có thể thu gọn",
      subtext: "Danh sách với các mục con có thể ẩn",
      aliases: ["li", "danh sach", "danh sach thu gon", "danh sach co the an"],
      group: "Khối cơ bản",
    },
    paragraph: {
      title: "Đoạn văn",
      subtext: "Sử dụng cho nội dung chính của tài liệu",
      aliases: ["p", "doanvan"],
      group: "Khối cơ bản",
    },
    code_block: {
      title: "Mã",
      subtext: "Sử dụng để hiển thị mã với cú pháp",
      aliases: ["code", "pre"],
      group: "Khối cơ bản",
    },
    page_break: {
      title: "Ngắt trang",
      subtext: "Phân cách trang",
      aliases: ["page", "break", "separator", "ngắt", "phân cách"],
      group: "Khối cơ bản",
    },
    table: {
      title: "Bảng",
      subtext: "Sử dụng để tạo bảng",
      aliases: ["bang"],
      group: "Nâng cao",
    },
    image: {
      title: "Hình ảnh",
      subtext: "Chèn hình ảnh",
      aliases: ["anh", "tai-len-anh", "tai-len", "img", "hinh", "media", "url"],
      group: "Phương tiện",
    },
    video: {
      title: "Video",
      subtext: "Chèn video",
      aliases: [
        "video",
        "tai-len-video",
        "tai-len",
        "mp4",
        "phim",
        "media",
        "url",
      ],
      group: "Phương tiện",
    },
    audio: {
      title: "Âm thanh",
      subtext: "Chèn âm thanh",
      aliases: [
        "âm thanh",
        "tai-len-am-thanh",
        "tai-len",
        "mp3",
        "am thanh",
        "media",
        "url",
      ],
      group: "Phương tiện",
    },
    file: {
      title: "Tệp",
      subtext: "Chèn tệp",
      aliases: ["tep", "tai-len", "nhung", "media", "url"],
      group: "Phương tiện",
    },
    emoji: {
      title: "Biểu tượng cảm xúc",
      subtext: "Dùng để chèn biểu tượng cảm xúc",
      aliases: [
        "biểu tượng cảm xúc",
        "emoji",
        "emoticon",
        "cảm xúc expression",
        "khuôn mặt",
        "face",
      ],
      group: "Khác",
    },
  },
  placeholders: {
    default: "Nhập văn bản hoặc gõ '/' để thêm định dạng",
    heading: "Tiêu đề",
    toggleListItem: "Chuyển đổi",
    bulletListItem: "Danh sách",
    numberedListItem: "Danh sách",
    checkListItem: "Danh sách",
    new_comment: "Viết bình luận...",
    edit_comment: "Chỉnh sửa bình luận...",
    comment_reply: "Thêm bình luận...",
  },
  file_blocks: {
    image: {
      add_button_text: "Thêm ảnh",
    },
    video: {
      add_button_text: "Thêm video",
    },
    audio: {
      add_button_text: "Thêm âm thanh",
    },
    file: {
      add_button_text: "Thêm tệp",
    },
  },
  // từ gói phản ứng:
  side_menu: {
    add_block_label: "Thêm khối",
    drag_handle_label: "Mở trình đơn khối",
  },
  drag_handle: {
    delete_menuitem: "Xóa",
    colors_menuitem: "Màu sắc",
    header_row_menuitem: "Tiêu đề hàng",
    header_column_menuitem: "Tiêu đề cột",
  },
  table_handle: {
    delete_column_menuitem: "Xóa cột",
    delete_row_menuitem: "Xóa hàng",
    add_left_menuitem: "Thêm cột bên trái",
    add_right_menuitem: "Thêm cột bên phải",
    add_above_menuitem: "Thêm hàng phía trên",
    add_below_menuitem: "Thêm hàng phía dưới",
    split_cell_menuitem: "Chia ô",
    merge_cells_menuitem: "Gộp ô",
    background_color_menuitem: "Màu nền",
  },
  suggestion_menu: {
    no_items_title: "Không tìm thấy mục nào",
  },
  color_picker: {
    text_title: "Văn bản",
    background_title: "Nền",
    colors: {
      default: "Mặc định",
      gray: "Xám",
      brown: "Nâu",
      red: "Đỏ",
      orange: "Cam",
      yellow: "Vàng",
      green: "Xanh lá",
      blue: "Xanh dương",
      purple: "Tím",
      pink: "Hồng",
    },
  },

  formatting_toolbar: {
    bold: {
      tooltip: "In đậm",
      secondary_tooltip: "Mod+B",
    },
    italic: {
      tooltip: "In nghiêng",
      secondary_tooltip: "Mod+I",
    },
    underline: {
      tooltip: "Gạch dưới",
      secondary_tooltip: "Mod+U",
    },
    strike: {
      tooltip: "Gạch ngang",
      secondary_tooltip: "Mod+Shift+X",
    },
    code: {
      tooltip: "Code",
      secondary_tooltip: "",
    },
    colors: {
      tooltip: "Màu sắc",
    },
    link: {
      tooltip: "Tạo liên kết",
      secondary_tooltip: "Mod+K",
    },
    file_caption: {
      tooltip: "Chỉnh sửa chú thích",
      input_placeholder: "Chỉnh sửa chú thích",
    },
    file_replace: {
      tooltip: {
        image: "Thay thế hình ảnh",
        video: "Thay thế video",
        audio: "Thay thế âm thanh",
        file: "Thay thế tệp",
      },
    },
    file_rename: {
      tooltip: {
        image: "Đổi tên hình ảnh",
        video: "Đổi tên video",
        audio: "Đổi tên âm thanh",
        file: "Đổi tên tệp",
      },
      input_placeholder: {
        image: "Đổi tên hình ảnh",
        video: "Đổi tên video",
        audio: "Đổi tên âm thanh",
        file: "Đổi tên tệp",
      },
    },
    file_download: {
      tooltip: {
        image: "Tải xuống hình ảnh",
        video: "Tải xuống video",
        audio: "Tải xuống âm thanh",
        file: "Tải xuống tệp",
      },
    },
    file_delete: {
      tooltip: {
        image: "Xóa hình ảnh",
        video: "Xóa video",
        audio: "Xóa âm thanh",
        file: "Xóa tệp",
      },
    },
    file_preview_toggle: {
      tooltip: "Chuyển đổi xem trước",
    },
    nest: {
      tooltip: "Lồng khối",
      secondary_tooltip: "Tab",
    },
    unnest: {
      tooltip: "Bỏ lồng khối",
      secondary_tooltip: "Shift+Tab",
    },
    align_left: {
      tooltip: "Căn trái văn bản",
    },
    align_center: {
      tooltip: "Căn giữa văn bản",
    },
    align_right: {
      tooltip: "Căn phải văn bản",
    },
    align_justify: {
      tooltip: "Căn đều văn bản",
    },
    table_cell_merge: {
      tooltip: "Gộp các ô",
    },
    comment: {
      tooltip: "Thêm bình luận",
    },
  },
  file_panel: {
    upload: {
      title: "Tải lên",
      file_placeholder: {
        image: "Tải lên hình ảnh",
        video: "Tải lên video",
        audio: "Tải lên âm thanh",
        file: "Tải lên tệp",
      },
      upload_error: "Lỗi: Tải lên thất bại",
    },
    embed: {
      title: "Nhúng",
      embed_button: {
        image: "Nhúng hình ảnh",
        video: "Nhúng video",
        audio: "Nhúng âm thanh",
        file: "Nhúng tệp",
      },
      url_placeholder: "Nhập URL",
    },
  },
  link_toolbar: {
    delete: {
      tooltip: "Xóa liên kết",
    },
    edit: {
      text: "Chỉnh sửa liên kết",
      tooltip: "Chỉnh sửa",
    },
    open: {
      tooltip: "Mở trong tab mới",
    },
    form: {
      title_placeholder: "Chỉnh sửa tiêu đề",
      url_placeholder: "Chỉnh sửa URL",
    },
  },
  comments: {
    edited: "đã chỉnh sửa",
    save_button_text: "Lưu",
    cancel_button_text: "Hủy",
    actions: {
      add_reaction: "Thêm phản ứng",
      resolve: "Giải quyết",
      edit_comment: "Chỉnh sửa bình luận",
      delete_comment: "Xóa bình luận",
      more_actions: "Thêm hành động",
    },
    reactions: {
      reacted_by: "Phản ứng bởi",
    },
    sidebar: {
      marked_as_resolved: "Đã đánh dấu là đã giải quyết",
      more_replies: (count) => `${count} câu trả lời nữa`,
    },
  },
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};
