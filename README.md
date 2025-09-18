# OnLuyen.vn AI Assistant

Một ứng dụng desktop được xây dựng bằng Electron giúp tăng cường trải nghiệm học tập trên trang web [App.onluyen.vn/](https://app.onluyen.vn/) bằng cách tích hợp một trợ lý AI mạnh mẽ được cung cấp bởi Google Gemini.

![Giao diện ứng dụng](https://i.imgur.com/your-screenshot.png) <!-- Bạn có thể thay thế bằng ảnh chụp màn hình thực tế -->

## ✨ Tính Năng Chính

- **Trình duyệt Tích hợp:** Duyệt trang `onluyen.vn` trong một ứng dụng desktop chuyên dụng với các điều khiển điều hướng cơ bản.
- **Bảng điều khiển AI Assistant:** Một sidebar mạnh mẽ cho phép bạn tương tác với AI.
- **Lấy API Key Gemini:** Dễ dàng lưu và quản lý Gemini API key của bạn.
- **Nhiều Chế độ AI:**
  - **📊 Phân tích:** Chụp ảnh màn hình và gửi cho AI để nhận giải thích chi tiết và đáp án cho các bài tập.
  - **🎯 Thực hiện hành động:** Để AI phân tích màn hình và đề xuất một chuỗi các hành động (ví dụ: "click vào đáp án A", "nhập '123' vào ô trả lời") mà bạn có thể thực hiện từng bước hoặc tất cả cùng một lúc.
  - **🔄 Tự động:** Chế độ tự động hoàn toàn, trong đó AI sẽ tự động phân tích, giải và thực hiện các hành động cho tất cả các bài tập trên trang.
- **Cửa sổ Pop-out:** Tách bảng điều khiển AI ra một cửa sổ riêng để quản lý không gian làm việc tốt hơn.
- **Cài đặt Tùy chỉnh:**
  - Tinh chỉnh hiệu suất với các cài đặt chất lượng ảnh chụp, giới hạn phần tử DOM và thời gian trễ.
  - Bật/tắt các tính năng như tự động mở Dev Console, giảm hiệu ứng và bộ nhớ đệm phản hồi.
  - Tắt thông báo pop-up.
- **Chỉ số Hiệu suất:** Theo dõi việc sử dụng RAM, FPS và các chỉ số khác trong thời gian thực.
- **Knowledge Base & RAG:** Xây dựng một cơ sở kiến thức tùy chỉnh và đặt câu hỏi cho hệ thống RAG (Retrieval-Augmented Generation).
- **Phím tắt:** Các phím tắt tiện dụng để tăng tốc quy trình làm việc của bạn.

## 🛠️ Công nghệ sử dụng

- **Electron:** Để xây dựng ứng dụng desktop đa nền tảng với JavaScript, HTML và CSS.
- **Node.js:** Môi trường chạy JavaScript phía sau.
- **Google Gemini API:** Cung cấp sức mạnh cho các khả năng phân tích và hành động của AI.
- **HTML / CSS / JavaScript:** Cho giao diện người dùng và logic phía client.

## 🚀 Cài đặt và Chạy

### Điều kiện tiên quyết

- Đã cài đặt [Node.js](https://nodejs.org/) (bao gồm npm).
- Một API Key từ [Google AI Studio (Gemini)](https://aistudio.google.com/app/apikey).

### Các bước cài đặt

1.  **Clone a repository:**
    ```bash
    git clone https://your-repository-url.git
    cd AI-fake-main
    ```

2.  **Cài đặt các dependency:**
    Mở terminal trong thư mục gốc của dự án và chạy:
    ```bash
    npm install
    ```

3.  **Chạy ứng dụng:**
    Sau khi cài đặt xong, khởi động ứng dụng với:
    ```bash
    npm start
    ```

## 📖 Cách Sử Dụng

1.  **Nhập API Key:**
    - Khởi động ứng dụng.
    - Trong bảng điều khiển "🤖 AI Assistant Control Panel", tìm trường "Gemini API Key".
    - Dán API key của bạn vào và nhấp vào liên kết "Lưu".

2.  **Chọn Model AI:**
    - Chọn một trong các model Gemini có sẵn từ menu thả xuống. `Gemini 2.5 Flash` được khuyến nghị để cân bằng giữa tốc độ và hiệu suất.

3.  **Chọn Chế độ AI:**
    - **Phân tích:** Để nhận giải thích cho một bài tập.
    - **Thực hiện hành động:** Để AI đề xuất các bước giải bài tập.
    - **Tự động:** Để AI tự động giải tất cả mọi thứ.

4.  **Chụp và Gửi:**
    - Điều hướng đến trang bài tập trên `onluyen.vn`.
    - Nhấp vào nút "📸 Chụp và Gửi AI" (hoặc sử dụng phím tắt `Ctrl+S`).
    - Ứng dụng sẽ chụp ảnh màn hình, phân tích DOM và gửi đến Gemini.

5.  **Xem Kết quả:**
    - Kết quả phân tích hoặc danh sách các hành động được đề xuất sẽ xuất hiện trong bảng điều khiển.
    - Nếu ở chế độ hành động, bạn có thể sử dụng các nút "▶️ Thực hiện tất cả" hoặc "⏭️ Thực hiện từng bước".

## ⚙️ Tổng quan về Cài đặt

Bạn có thể mở menu cài đặt bằng cách nhấp vào biểu tượng bánh răng ⚙️. Dưới đây là tóm tắt các tùy chọn có sẵn:

- **Screenshot Quality:** Giảm chất lượng để gửi ảnh nhanh hơn.
- **Auto Open Dev Console:** Tự động mở cửa sổ console dành cho nhà phát triển khi khởi động.
- **DOM Snapshot Limit:** Giới hạn số lượng phần tử DOM được gửi đến AI để phân tích nhanh hơn.
- **Reduce Animations:** Tắt các hiệu ứng chuyển tiếp và hoạt ảnh để có giao diện nhạy hơn.
- **Disable Notifications:** Tắt tất cả các thông báo pop-up.
- **Auto Mode Delay:** Đặt thời gian chờ (tính bằng mili giây) giữa mỗi hành động trong chế độ Tự động.
- **Enable Response Cache:** Lưu trữ các phản hồi API để tránh gửi lại các yêu cầu giống hệt nhau.
- **Debug Mode:** Hiển thị thêm log chi tiết cho việc gỡ lỗi.

## ⌨️ Phím tắt

- `Ctrl` + `S`: Chụp và gửi đến AI.
- `Ctrl` + `Enter`: Phím tắt thay thế để Chụp và Gửi.
- `Ctrl` + `A`: Bật/tắt Chế độ Tự động.
- `F12`: Bật/tắt Dev Console.
- `Ctrl` + `Shift` + `I`: Mở DevTools của cửa sổ chính.
- `Alt` + `ArrowLeft`: Quay lại trang trước.
- `Alt` + `ArrowRight`: Tiến tới trang sau.
