<div align="center">
  <br/>
  <h1>🚀 OnLuyen.vn AI Assistant: Kỷ nguyên mới của Học tập Tương tác 🚀</h1>
  <p>
    <strong>Một nền tảng máy tính để bàn mang tính cách mạng, được thiết kế để định nghĩa lại ranh giới của giáo dục trực tuyến. Bằng cách kết hợp sức mạnh của tự động hóa thông minh, phân tích đa phương thức và các mô hình AI tiên tiến, dự án này biến việc học thụ động thành một trải nghiệm tương tác, hiệu quả và được cá nhân hóa sâu sắc.</strong>
  </p>
  <br/>
  <p>
    <img src="https://img.shields.io/badge/Electron-^27.0.0-47848F?style=for-the-badge&logo=electron" alt="Electron">
    <img src="https://img.shields.io/badge/Google-Gemini_API-8A2BE2?style=for-the-badge&logo=google" alt="Gemini API">
    <img src="https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  </p>
</div>

---

## 📜 Mục lục

1.  [Triết lý Dự án](#-triết-lý-dự-án)
2.  [Tổng quan Tính năng Chuyên sâu](#-tổng-quan-tính-năng-chuyên-sâu)
    *   [Bảng điều khiển AI Độc lập](#-bảng-điều-khiển-trợ-lý-ai-độc-lập)
    *   [Phân tích Đa phương thức](#-phân-tích-đa-phương-thức-hình-ảnh--dom)
    *   [Tự động hóa Hành động Tinh vi](#️-tự-động-hóa-hành-động-tinh-vi)
    *   [Cơ sở Tri thức Tự học](#-cơ-sở-tri-thức-thích-ứng-tự-học)
    *   [Cơ chế Stealth & Chống theo dõi](#-cơ-chế-stealth--chống-theo-dõi)
    *   [Bộ công cụ dành cho Nhà phát triển](#-bộ-công-cụ-dành-cho-nhà-phát-triển)
3.  [Kiến trúc Kỹ thuật](#-kiến-trúc-kỹ-thuật)
4.  [Hướng dẫn Bắt đầu](#-hướng-dẫn-bắt-đầu)
5.  [Tùy chỉnh & Cấu hình](#️-tùy-chỉnh--cấu-hình)
6.  [Xây dựng và Triển khai](#-xây-dựng-và-triển-khai)
7.  [Lộ trình Phát triển](#-lộ-trình-phát-triển)
8.  [Đóng góp cho Dự án](#-đóng-góp-cho-dự-án)
9.  [Lời cảm ơn](#-lời-cảm-ơn)

---

## 🔭 Triết lý Dự án

Trong bối cảnh giáo dục số hóa ngày càng phát triển, chúng ta thường xuyên đối mặt với những nền tảng học tập một chiều, thiếu tính tương tác và khả năng thích ứng. **OnLuyen.vn AI Assistant** được sinh ra từ một triết lý cốt lõi: **trao quyền cho người học**. Chúng tôi tin rằng công nghệ, đặc biệt là trí tuệ nhân tạo, có thể và nên được sử dụng để phá vỡ các rào cản, biến việc học từ một quá trình thụ động thành một cuộc đối thoại năng động và được cá nhân hóa.

## ✨ Tổng quan Tính năng Chuyên sâu

#### 🤖 Bảng điều khiển Trợ lý AI Độc lập

Đây là trung tâm thần kinh của ứng dụng, hoạt động như một cửa sổ độc lập, mang lại sự linh hoạt tối đa. Giao diện được thiết kế tối giản nhưng mạnh mẽ, cho phép bạn nhập yêu cầu, chọn mô hình AI, và khởi động các chế độ "Phân tích" hoặc "Hành động".

#### 📸 Phân tích Đa phương thức (Hình ảnh + DOM)

Chúng tôi kết hợp ảnh chụp màn hình và quét cấu trúc DOM, cung cấp cho AI một bức tranh toàn cảnh về cả giao diện và cấu trúc của trang web. Điều này cho phép AI "hiểu" bối cảnh một cách sâu sắc, đưa ra những phân tích và hành động chính xác hơn.

#### ⌨️ Tự động hóa Hành động Tinh vi

AI có thể thực hiện các hành động phức tạp như nhấp chuột, nhập liệu, và cuộn trang một cách tự động. Các hành động này được mô phỏng để giống với hành vi của người dùng thật, đảm bảo tính tương thích và hiệu quả.

#### 🧠 Cơ sở Tri thức Thích ứng (Tự học)

Ứng dụng sử dụng `lowdb` để tạo một cơ sở dữ liệu JSON cục bộ, lưu lại các câu hỏi và câu trả lời đã được AI xử lý. Điều này giúp giảm chi phí gọi API và tăng tốc độ phản hồi cho các câu hỏi lặp lại.

#### 🛡️ Cơ chế Stealth & Chống theo dõi

Nhiều nền tảng trực tuyến tích hợp các cơ chế để phát hiện và ngăn chặn bot. Ứng dụng của chúng tôi sử dụng các chiến lược tinh vi để hoạt động một cách kín đáo và tránh bị phát hiện:

*   **Mô phỏng Hành vi Người dùng:** Thông qua `anti-tracking.js`, ứng dụng không chỉ thực hiện các hành động một cách máy móc. Nó mô phỏng các hành vi tự nhiên của con người như di chuyển chuột ngẫu nhiên, có những khoảng dừng ngắn, tốc độ gõ phím không đều, và các kiểu cuộn trang khác nhau. Điều này tạo ra một "dấu chân kỹ thuật số" giống người hơn, gây khó khăn cho các thuật toán phát hiện bot.
*   **Vô hiệu hóa Trình theo dõi:** Tập lệnh chủ động tìm và vô hiệu hóa các hàm JavaScript phổ biến liên quan đến việc gửi dữ liệu phân tích (analytics), theo dõi dấu vân tay trình duyệt (browser fingerprinting), và các sự kiện theo dõi hành vi người dùng (như `blur`, `focus`, `visibilitychange`).
*   **Gửi Tín hiệu Giả:** `fake-event.js` được thiết kế để đánh lừa các hệ thống giám sát bằng cách định kỳ gửi các sự kiện giả mạo, chẳng hạn như "OUTSCREEN" (ra khỏi màn hình), ngay cả khi người dùng vẫn đang ở trong trang. Điều này giúp che giấu hành vi thực của bot và duy trì trạng thái "an toàn".

#### 🛠️ Bộ công cụ dành cho Nhà phát triển

Chúng tôi cung cấp một bộ công cụ mạnh mẽ để gỡ lỗi và phát triển, giúp bạn dễ dàng tùy chỉnh và mở rộng ứng dụng:

*   **`Ctrl+Shift+I` (DevTools Cửa sổ chính):** Mở Chromium DevTools cho cửa sổ điều khiển AI. Công cụ này rất cần thiết để gỡ lỗi giao diện người dùng và các tập lệnh trong `renderer.js`.
*   **`Ctrl+Shift+O` (DevTools Webview):** Mở một phiên DevTools riêng biệt được gắn trực tiếp vào nội dung của trang web OnLuyen.vn. Đây là công cụ không thể thiếu để kiểm tra DOM, phân tích các vấn đề mạng của trang web, và theo dõi hoạt động của các tập lệnh stealth.
*   **`F12` (Bảng điều khiển Dev Tùy chỉnh):** Một cửa sổ hiển thị log được tùy chỉnh, chỉ hiển thị các thông điệp quan trọng từ ứng dụng. Điều này giúp bạn tập trung vào luồng logic chính mà không bị nhiễu bởi các thông báo gỡ lỗi của trình duyệt.

## 🏛️ Kiến trúc Kỹ thuật

Ứng dụng được xây dựng trên mô hình đa tiến trình của Electron, bao gồm **Tiến trình Chính (Main Process)** xử lý logic backend và **Tiến trình Hiển thị (Renderer Process)** quản lý giao diện người dùng. Giao tiếp giữa hai tiến trình được thực hiện an toàn thông qua `contextBridge` và IPC.

## 🚀 Hướng dẫn Bắt đầu

### Yêu cầu Hệ thống

*   **Hệ điều hành:** Windows, macOS, hoặc Linux.
*   **Node.js:** Phiên bản `v18.x` (LTS) hoặc mới hơn.

### Quy trình Cài đặt

1.  **Sao chép Kho mã nguồn:**
    ```bash
    git clone https://github.com/Junior-Frontend-dev/app.onluyen-solver
    cd app.onluyen-solver-main
    ```

2.  **Cài đặt các Gói phụ thuộc:**
    ```bash
    npm install
    ```

### Khởi chạy Ứng dụng

*   **Khởi động Tiêu chuẩn:**
    ```bash
    npm start
    ```
*   **Khởi động Nhanh (Tắt tăng tốc GPU):**
    ```bash
    npm start-fast
    ```
*   **Khởi động Gỡ lỗi (Ghi log chi tiết):**
    ```bash
    npm start-debug
    ```

## ⚙️ Tùy chỉnh & Cấu hình

Bạn có thể dễ dàng tùy chỉnh các cài đặt chính của ứng dụng bằng cách sửa đổi đối tượng `mainSettings` trong file `main.js`.

## 📦 Xây dựng và Triển khai

Sử dụng `electron-builder` để đóng gói ứng dụng thành một trình cài đặt có thể phân phối.

```bash
npm run build
```

## 🗺️ Lộ trình phát triển

Dự án này liên tục phát triển. Dưới đây là một số tính năng chúng tôi đang xem xét cho tương lai:

*   [ ] **Tìm kiếm Vector cho Cơ sở Tri thức:** Thay thế tìm kiếm chuỗi đơn giản bằng hệ thống embedding để tìm các câu hỏi tương tự về mặt ngữ nghĩa.
*   [ ] **Hỗ trợ Đa nền tảng Học tập:** Tạo các "adapter" để ứng dụng có thể hoạt động trên các trang web giáo dục khác.
*   [ ] **Giao diện Quản lý Cơ sở Tri thức:** Cho phép người dùng duyệt, chỉnh sửa và xóa các mục trong cơ sở tri thức.
*   [ ] **Học tập Cộng tác:** Cho phép người dùng tùy chọn chia sẻ và sử dụng cơ sở tri thức của cộng đồng.
*   [ ] **Hệ thống Plugin:** Cho phép cộng đồng viết các plugin của riêng họ để mở rộng chức năng.
*   [ ] **Nâng cấp Giao diện bằng Framework:** Xây dựng lại giao diện người dùng bằng một framework hiện đại như React hoặc Vue.js để có một thiết kế chuyên nghiệp, đẹp mắt và dễ bảo trì hơn.
*   [ ] **Tìm kiếm Vector cho Cơ sở Tri thức:** Thay vì tìm kiếm chính xác chuỗi văn bản, sử dụng AI để tìm các câu hỏi tương tự về mặt ngữ nghĩa trong cơ sở dữ liệu, giúp tăng tỷ lệ tìm thấy câu trả lời cũ lên rất nhiều.
## 🤝 Đóng góp cho Dự án

Chúng tôi hoan nghênh mọi hình thức đóng góp. Vui lòng **Fork** kho mã nguồn, tạo một **Feature Branch**, và mở một **Pull Request** để đề xuất các thay đổi của bạn.

## ❤️ Lời cảm ơn

Xin chân thành cảm ơn bạn đã quan tâm và sử dụng dự án OnLuyen.vn AI Assistant. Sự ủng hộ của bạn là nguồn động lực to lớn để chúng tôi tiếp tục phát triển và cải tiến công cụ này, với hy vọng mang lại một phương pháp học tập hiệu quả và đột phá hơn cho cộng đồng.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Junior-Frontend-dev/app.onluyen-solver&type=Date)](https://www.star-history.com/#Junior-Frontend-dev/app.onluyen-solver&Date)

---
<div align="center">
  <em>Được build with love bởi Junior-Frontend-dev và Trongdepzai-dev</em>
</div>
