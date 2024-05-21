import type { Dictionary } from "../dictionary";

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
    numbered_list: {
      title: "Danh sách đánh số",
      subtext: "Sử dụng để hiển thị danh sách có đánh số",
      aliases: ["ol", "li", "ds", "danhsachdso", "danh sách đánh số"],
      group: "Khối cơ bản",
    },
    bullet_list: {
      title: "Danh sách",
      subtext: "Sử dụng để hiển thị danh sách không đánh số",
      aliases: ["ul", "li", "ds", "danhsach", "danh sách"],
      group: "Khối cơ bản",
    },
    paragraph: {
      title: "Đoạn văn",
      subtext: "Sử dụng cho nội dung chính của tài liệu",
      aliases: ["p", "doanvan"],
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
      aliases: [
        "anh",
        "tai-len-anh",
        "tai-len",
        "img",
        "hinh",
        "media",
        "url",
        "drive",
        "dropbox",
      ],
      group: "Phương tiện",
    },
  },
  placeholders: {
    default: "Nhập văn bản hoặc gõ '/' để thêm định dạng",
    heading: "Tiêu đề",
    bulletListItem: "Danh sách",
    numberedListItem: "Danh sách",
  },
  image: {
    add_button: "Thêm ảnh",
  },
  // từ gói phản ứng:
  side_menu: {
    add_block_label: "Thêm khối",
    drag_handle_label: "Mở trình đơn khối",
  },
  drag_handle: {
    delete_menuitem: "Xóa",
    colors_menuitem: "Màu sắc",
  },
  table_handle: {
    delete_column_menuitem: "Xóa cột",
    delete_row_menuitem: "Xóa hàng",
    add_left_menuitem: "Thêm cột bên trái",
    add_right_menuitem: "Thêm cột bên phải",
    add_above_menuitem: "Thêm hàng phía trên",
    add_below_menuitem: "Thêm hàng phía dưới",
  },
  suggestion_menu: {
    no_items_title: "Không tìm thấy mục nào",
    loading: "Đang tải...",
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
    image_caption: {
      tooltip: "Chỉnh sửa chú thích",
      input_placeholder: "Chỉnh sửa chú thích",
    },
    image_replace: {
      tooltip: "Thay thế hình ảnh",
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
  },
  image_panel: {
    upload: {
      title: "Tải lên",
      file_placeholder: "Tải lên hình ảnh",
      upload_error: "Lỗi: Tải lên thất bại",
    },
    embed: {
      title: "Nhúng",
      embed_button: "Nhúng hình ảnh",
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
  generic: {
    ctrl_shortcut: "Ctrl",
  },
};