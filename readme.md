# Ứng dụng học tiếng Anh mini

Ứng dụng được xây dựng bằng HTML/CSS/JavaScript thuần, sử dụng JSON và Markdown để quản lý nội dung bài học. Người dùng có thể duyệt mục lục, xem bài học theo từng loại (từ vựng, ngữ pháp, bài đọc, bài kiểm tra) và ghi nhớ tiến trình thông qua LocalStorage.

## Cách chạy

1. Cài đặt một máy chủ tĩnh đơn giản (ví dụ `python -m http.server`).
2. Chạy máy chủ tại thư mục dự án:

   ```bash
   cd hoctienganh
   python -m http.server 4173
   ```

3. Mở trình duyệt và truy cập `http://localhost:4173`.

> Lưu ý: Do ứng dụng sử dụng `fetch` để lấy dữ liệu JSON/Markdown, cần chạy qua máy chủ tĩnh thay vì mở file trực tiếp.

## Cấu trúc nội dung

- `content/index.json`: Mục lục chính, định nghĩa danh sách bài học cho từng loại.
- `content/vocabulary/*.json`: Dữ liệu từ vựng ở dạng JSON.
- `content/**/*.md`: Nội dung chi tiết hiển thị bằng Markdown.
- `content/quiz/*.json`: Bộ câu hỏi trắc nghiệm.

## Tính năng nổi bật

- Trang mục lục hiển thị trạng thái đã học/đang học/hoàn thành.
- Các layout riêng cho từ vựng, ngữ pháp, bài đọc, bài kiểm tra.
- Nút phát âm trong layout từ vựng sử dụng Web Speech API (nếu trình duyệt hỗ trợ).
- Ghi nhớ tiến trình học trong LocalStorage.
- Điều hướng Prev/Next giữa các bài học.

Bạn có thể chỉnh sửa hoặc bổ sung thêm bài học bằng cách cập nhật các file JSON/Markdown tương ứng.
