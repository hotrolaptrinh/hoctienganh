# Ứng dụng học ngoại ngữ

Ứng dụng được xây dựng bằng HTML/CSS/JavaScript thuần, sử dụng JSON và Markdown để quản lý nội dung bài học. Người dùng có thể duyệt mục lục, xem bài học theo từng loại (từ vựng, ngữ pháp, bài đọc, bài kiểm tra), chuyển đổi ngôn ngữ học và ghi nhớ tiến trình thông qua LocalStorage.

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

- `content/index.json`: Mục lục chính, định nghĩa danh sách bài học cho từng ngôn ngữ và loại bài.
- `content/en/*`: Kho bài học tiếng Anh, gồm các thư mục con `vocabulary/`, `grammar/`, `reading/`, `quiz/` với dữ liệu JSON và Markdown tương ứng.
- `content/zh-hans/*`: Kho bài học tiếng Trung giản thể với cấu trúc thư mục tương tự, có thể mở rộng cho các ngôn ngữ khác.

## Nhánh làm việc

- Tất cả thay đổi được thực hiện trực tiếp trên nhánh `main`. Kho bài học không sử dụng thêm nhánh phụ.

## Tính năng nổi bật

- Chuyển đổi nhanh ngôn ngữ học ngay trên đầu trang (lưu lựa chọn vào cookie).
- Trang mục lục hiển thị danh sách bài học theo từng loại với nút "Đang học"/"Học tiếp" và vùng cuộn ngang cho danh sách dài.
- Các layout riêng cho từ vựng, ngữ pháp, bài đọc, bài kiểm tra.
- Nút phát âm trong layout từ vựng sử dụng Web Speech API (nếu trình duyệt hỗ trợ) và tự động đổi giọng theo ngôn ngữ đang học.
- Ghi nhớ tiến trình học trong LocalStorage.
- Điều hướng Prev/Next giữa các bài học.

Kho dữ liệu mẫu hiện cung cấp đầy đủ lộ trình tiếng Anh và một bộ bài học nhập môn tiếng Trung giản thể cho từng loại nội dung.

Bạn có thể chỉnh sửa hoặc bổ sung thêm bài học bằng cách cập nhật các file JSON/Markdown tương ứng.

## Giấy phép

Dự án này phân phối theo giấy phép Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). Bạn có thể sao chép, chia sẻ và tùy biến mã nguồn cho mục đích phi thương mại khi vẫn giữ ghi nhận tác giả gốc. Xem file `LICENSE` để biết chi tiết.

## Mô tả

App học ngoại ngữ mã nguồn mở, không quảng cáo và miễn phí cho mục đích phi thương mại. LinguaBox cung cấp các bài học ngắn gọn về từ vựng, ngữ pháp, bài đọc và bài kiểm tra; hỗ trợ học offline qua PWA, thân thiện với người mới bắt đầu và người dùng bận rộn. Không có theo dõi người dùng hoặc quảng cáo, ưu tiên trải nghiệm học tập thuần túy.
