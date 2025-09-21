
<div align="center">
  <br/>
  <h1>🚀 OnLuyen.vn AI Assistant: Kỷ nguyên mới của Học tập Tương tác 🚀</h1>
  <p>
    <strong>Một nền tảng máy tính để bàn mang tính cách mạng, được thiết kế để định nghĩa lại ranh giới của giáo dục trực tuyến. Bằng cách kết hợp sức mạnh của tự động hóa thông minh, phân tích đa phương thức và các mô hình AI tiên tiến, dự án này biến việc học thụ động thành một trải nghiệm tương tác, hiệu quả và được cá nhân hóa sâu sắc.</strong>
  </p>
  <br/>
  <p>
    <a href="https://github.com/Junior-Frontend-dev/app.onluyen-solver/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Junior-Frontend-dev/onluyen-electron-app?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/Junior-Frontend-dev/app.onluyen-solver/releases"><img src="https://img.shields.io/github/package-json/v/Junior-Frontend-dev/onluyen-electron-app?style=for-the-badge" alt="Version"></a>
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
    *   [Cơ chế Stealth & Chống theo dõi](#-cơ-chế-stealth--chống-theo-dõi-nâng-cao)
    *   [Bộ công cụ dành cho Nhà phát triển](#-bộ-công-cụ-toàn-diện-dành-cho-nhà-phát-triển)
3.  [Kiến trúc Kỹ thuật](#-kiến-trúc-kỹ-thuật)
    *   [Mô hình Đa tiến trình của Electron](#mô-hình-đa-tiến-trình-của-electron)
    *   [Giao tiếp An toàn giữa các Tiến trình (IPC)](#giao-tiếp-an-toàn-giữa-các-tiến-trình-ipc)
    *   [Tương tác với Gemini API](#tương-tác-với-gemini-api)
4.  [Hướng dẫn Bắt đầu](#-hướng-dẫn-bắt-đầu)
    *   [Yêu cầu Hệ thống](#yêu-cầu-hệ-thống)
    *   [Quy trình Cài đặt](#quy-trình-cài-đặt)
    *   [Khởi chạy Ứng dụng](#khởi-chạy-ứng-dụng)
5.  [Tùy chỉnh & Cấu hình](#️-tùy-chỉnh--cấu-hình)
6.  [Xây dựng và Triển khai](#-xây-dựng-và-triển-khai)
7.  [Lộ trình Phát triển](#-lộ-trình-phát-triển)
8.  [Đóng góp cho Dự án](#-đóng-góp-cho-dự-án)

---

## 🔭 Triết lý Dự án

Trong bối cảnh giáo dục số hóa ngày càng phát triển, chúng ta thường xuyên đối mặt với những nền tảng học tập một chiều, thiếu tính tương tác và khả năng thích ứng. **OnLuyen.vn AI Assistant** được sinh ra từ một triết lý cốt lõi: **trao quyền cho người học**. Chúng tôi tin rằng công nghệ, đặc biệt là trí tuệ nhân tạo, có thể và nên được sử dụng để phá vỡ các rào cản, biến việc học từ một quá trình thụ động thành một cuộc đối thoại năng động và được cá nhân hóa.

**Các trụ cột chính của chúng tôi:**

1.  **Tự động hóa là Giải phóng:** Bằng cách tự động hóa các nhiệm vụ lặp đi lặp lại và tốn thời gian, chúng tôi giải phóng thời gian và năng lượng tinh thần của người học, cho phép họ tập trung vào việc hiểu sâu các khái niệm cốt lõi thay vì các thao tác cơ học.

2.  **Bối cảnh là Vua:** Một câu trả lời đúng mà không có lời giải thích đầy đủ chỉ là một nửa của sự thật. Phương pháp tiếp cận đa phương thức của chúng tôi, kết hợp phân tích hình ảnh và cấu trúc DOM, đảm bảo rằng AI không chỉ "nhìn thấy" câu hỏi mà còn "hiểu" được bối cảnh tương tác của nó. Điều này dẫn đến những giải thích sâu sắc và phù hợp hơn.

3.  **Minh bạch và Tùy biến:** Đây là một dự án mã nguồn mở. Chúng tôi khuyến khích người dùng và các nhà phát triển xem xét mã nguồn, hiểu cách nó hoạt động và tùy chỉnh nó để phù hợp với nhu cầu học tập riêng của họ. Từ việc điều chỉnh các tham số AI đến việc sửa đổi các tập lệnh tự động hóa, ứng dụng được thiết kế để có thể uốn nắn.

4.  **Hiệu suất là Tính năng:** Một công cụ mạnh mẽ sẽ trở nên vô dụng nếu nó chậm chạp và nặng nề. Chúng tôi bị ám ảnh bởi việc tối ưu hóa hiệu suất, từ việc dọn dẹp bộ nhớ đệm một cách chủ động, tắt các tính năng không cần thiết của GPU, đến việc triển khai một cơ sở tri thức cục bộ để giảm thiểu độ trễ của mạng.

## ✨ Tổng quan Tính năng Chuyên sâu

#### 🤖 Bảng điều khiển Trợ lý AI Độc lập

Đây là trung tâm thần kinh của ứng dụng, giờ đây hoạt động như một cửa sổ độc lập, mang lại sự linh hoạt tối đa. Giao diện được thiết kế tối giản nhưng mạnh mẽ, bao gồm:

*   **Vùng điều khiển chính:** Nơi bạn nhập các yêu cầu tùy chỉnh cho AI, chọn mô hình Gemini và khởi động các chế độ "Phân tích" hoặc "Hành động".
*   **Cửa sổ phản hồi:** Hiển thị kết quả phân tích của AI, bao gồm đáp án và giải thích chi tiết, được định dạng rõ ràng bằng Markdown.
*   **Nhật ký hành động (Action Log):** Khi ở chế độ "Hành động", khu vực này sẽ hiển thị các bước mà AI dự định thực hiện, cho phép bạn xem trước và xác nhận.
*   **Quản lý API Key:** Giao diện để quản lý danh sách các API key Gemini của bạn, với khả năng tự động xoay vòng khi một key hết hạn mức.

#### 📸 Phân tích Đa phương thức (Hình ảnh + DOM)

Đây là "nước sốt bí mật" của ứng dụng. Thay vì chỉ dựa vào OCR (Nhận dạng ký tự quang học) có thể dễ gặp lỗi, chúng tôi áp dụng một phương pháp hai lớp để cung cấp cho AI một bức tranh toàn cảnh:

1.  **Lớp Thị giác (Visual Layer):** Ứng dụng chụp một ảnh chụp màn hình (`.jpeg`) của nội dung webview. Lớp này cung cấp cho AI thông tin về bố cục, hình ảnh, màu sắc và văn bản được hiển thị—giống như cách một người dùng nhìn vào trang.

2.  **Lớp Cấu trúc (Structural Layer):** Đồng thời, một tập lệnh JavaScript được thực thi để quét cây DOM của trang. Nó không chỉ trích xuất văn bản mà còn cả siêu dữ liệu quan trọng: tọa độ (`x`, `y`, `width`, `height`), các thuộc tính (`id`, `class`, `name`), trạng thái (`checked`, `selected`) và khả năng tương tác (`isClickable`). Mỗi phần tử tương tác được gán một `ai_id` duy nhất.

Khi cả hai lớp dữ liệu này được gửi đến Gemini, AI có thể thực hiện các suy luận phức tạp. Ví dụ, nó có thể thấy một nút màu xanh lá cây trong hình ảnh và, bằng cách tham chiếu dữ liệu DOM, xác định chính xác `ai_id` của nút đó và tọa độ để nhấp vào.

#### ⌨️ Tự động hóa Hành động Tinh vi

Khi bạn yêu cầu AI "giải quyết bài tập này", nó sẽ trả về một đối tượng JSON chứa một chuỗi các hành động. Tiến trình chính của Electron sau đó sẽ diễn giải và thực thi các hành động này một cách tuần tự trên webview.

*   **`perform-click(x, y)`:** Không chỉ là một cú nhấp chuột mù quáng. Ứng dụng gửi một chuỗi các sự kiện `mouseDown` và `mouseUp` tại các tọa độ chính xác được cung cấp bởi AI, mô phỏng một cú nhấp chuột thực sự.

*   **`perform-type(text, x, y)`:** Mô phỏng hành vi gõ của con người. Nó đầu tiên nhấp vào phần tử để đảm bảo nó được focus, sau đó mô phỏng tổ hợp phím `Ctrl+A` và `Delete` để xóa bất kỳ nội dung hiện có nào, và cuối cùng chèn văn bản mới bằng cách sử dụng `insertText` hoặc mô phỏng từng lần nhấn phím.

*   **`perform-scroll(deltaY)`:** Cho phép AI điều hướng các trang dài bằng cách gửi sự kiện `mouseWheel`, cuộn trang lên hoặc xuống để tìm kiếm thông tin hoặc các nút cần thiết.

#### 🧠 Cơ sở Tri thức Thích ứng (Tự học)

Để giảm chi phí API và tăng tốc độ phản hồi, ứng dụng triển khai một hệ thống cache thông minh sử dụng `lowdb`, một cơ sở dữ liệu JSON nhỏ gọn.

*   **Lưu trữ:** Sau mỗi lần phân tích thành công từ Gemini, câu hỏi (thường là văn bản chính được trích xuất từ DOM) và câu trả lời/giải thích của AI sẽ được lưu lại.
*   **Tìm kiếm:** Trước khi thực hiện một lệnh gọi API mới, ứng dụng sẽ thực hiện tìm kiếm trong file `db.json`. Nếu một câu hỏi đủ tương tự được tìm thấy, nó sẽ trả về câu trả lời đã lưu ngay lập tức.
*   **Cơ chế:** Hiện tại, việc tìm kiếm là một sự so khớp chuỗi đơn giản. Lộ trình phát triển bao gồm việc nâng cấp lên tìm kiếm mờ (fuzzy search) hoặc thậm chí là tìm kiếm vector để có kết quả phù hợp hơn.

#### 🛡️ Cơ chế Stealth & Chống theo dõi Nâng cao

Nhiều trang web hiện đại tích hợp các kịch bản để phát hiện và chặn các bot tự động hóa. Ứng dụng của chúng tôi sử dụng hai chiến lược để hoạt động một cách kín đáo:

*   **`anti-tracking.js`:** Tập lệnh này được thiết kế để vô hiệu hóa các trình theo dõi phổ biến. Nó có thể ghi đè các hàm JavaScript gốc liên quan đến việc gửi dữ liệu phân tích (analytics), theo dõi dấu vân tay trình duyệt (browser fingerprinting), hoặc các cơ chế quảng cáo có thể làm chậm hoặc cản trở việc thực thi tập lệnh của chúng ta.

*   **`fake-event.js`:** Làm cho các hành động của bot trông giống người hơn. Thay vì thực hiện các hành động ngay lập tức, tập lệnh này có thể được cấu hình để thêm các độ trễ ngẫu nhiên nhỏ giữa các lần nhấp chuột, di chuyển con trỏ chuột một cách tự nhiên trên màn hình trước khi nhấp, hoặc mô phỏng tốc độ gõ phím không đều.

#### 🛠️ Bộ công cụ Toàn diện dành cho Nhà phát triển

Một công cụ mạnh mẽ cần các công cụ gỡ lỗi mạnh mẽ.

*   **`Ctrl+Shift+I` (DevTools Cửa sổ chính):** Mở Chromium DevTools cho chính cửa sổ ứng dụng. Sử dụng nó để:
    *   Kiểm tra và sửa đổi giao diện người dùng của Bảng điều khiển AI.
    *   Gỡ lỗi các vấn đề trong `renderer.js`.
    *   Phân tích hiệu suất của giao diện người dùng.

*   **`Ctrl+Shift+O` (DevTools Webview):** *Tính năng mới quan trọng!* Mở một phiên DevTools riêng biệt được gắn vào nội dung web của OnLuyen.vn. Đây là công cụ không thể thiếu để:
    *   Xem các lỗi JavaScript hoặc các vấn đề mạng từ chính trang web.
    *   Kiểm tra các bộ chọn DOM (DOM selectors) trước khi viết các tập lệnh tự động hóa.
    *   Theo dõi cách các tập lệnh của chúng ta (ví dụ: `anti-tracking.js`) đang tương tác với trang.

*   **`F12` (Bảng điều khiển Dev Tùy chỉnh):** Một cửa sổ đầu ra sạch sẽ, được lọc, chỉ hiển thị các thông điệp được ghi lại một cách có chủ ý thông qua hàm `devLog`. Điều này giúp bạn tập trung vào luồng logic của ứng dụng mà không bị phân tâm bởi hàng trăm thông báo gỡ lỗi của trình duyệt.

## 🏛️ Kiến trúc Kỹ thuật

Hiểu được cấu trúc bên trong của ứng dụng sẽ giúp bạn tùy chỉnh và mở rộng nó một cách hiệu quả.

### Mô hình Đa tiến trình của Electron

Ứng dụng tuân thủ mô hình hai tiến trình cốt lõi của Electron:

*   **Tiến trình Chính (Main Process):** Được điều khiển bởi `main.js`. Đây là "backend" của ứng dụng. Nó có toàn quyền truy cập vào các API của Node.js và chịu trách nhiệm quản lý vòng đời của ứng dụng, tạo và quản lý các cửa sổ trình duyệt (`BrowserWindow`), xử lý các sự kiện hệ thống và thực hiện các hoạt động nặng như tương tác với hệ thống file hoặc gọi API mạng.

*   **Tiến trình Hiển thị (Renderer Process):** Mỗi cửa sổ trình duyệt (`index.html`, `dev-console.html`) chạy trong tiến trình hiển thị riêng của nó. Mã trong `renderer.js` điều khiển giao diện và tương tác của người dùng trong cửa sổ chính. Nó không thể truy cập trực tiếp vào các API của Node.js vì lý do bảo mật.

### Giao tiếp An toàn giữa các Tiến trình (IPC)

Để hai tiến trình này có thể nói chuyện với nhau, Electron cung cấp một hệ thống Giao tiếp giữa các Tiến trình (IPC).

*   **`preload.js`:** Đây là một tập lệnh đặc biệt chạy trong một bối cảnh có đặc quyền, hoạt động như một cây cầu. Nó có thể truy cập cả DOM của trang web và một tập hợp con các API của Node.js. Nó được sử dụng để phơi bày một cách an toàn các chức năng từ tiến trình chính cho tiến trình hiển thị thông qua API `contextBridge`.

*   **Luồng dữ liệu:**
    1.  Người dùng nhấp vào một nút trong `index.html` (Tiến trình Hiển thị).
    2.  `renderer.js` gọi một hàm đã được phơi bày trên đối tượng `window` (ví dụ: `window.api.captureScreenshot()`).
    3.  Hàm này, được định nghĩa trong `preload.js`, gửi một thông điệp IPC đến tiến trình chính bằng `ipcRenderer.invoke()`.
    4.  `main.js` lắng nghe thông điệp này bằng `ipcMain.handle()`, thực hiện hành động cần thiết (ví dụ: chụp ảnh màn hình của webview), và trả về một kết quả.
    5.  Kết quả này được trả về dưới dạng một `Promise` cho lệnh gọi `ipcRenderer.invoke` ban đầu trong tiến trình hiển thị.

### Tương tác với Gemini API

Việc giao tiếp với Google Gemini được đóng gói cẩn thận trong tiến trình chính để bảo vệ các API key.

*   **Payload Request:** Khi được kích hoạt, ứng dụng xây dựng một đối tượng payload JSON phức tạp chứa:
    *   Một `system prompt` để hướng dẫn AI về vai trò và định dạng đầu ra mong muốn.
    *   `user prompt` từ người dùng.
    *   Dữ liệu hình ảnh được mã hóa Base64.
    *   Dữ liệu snapshot DOM được tuần tự hóa JSON.
*   **Quản lý và Xoay vòng Key:** Ứng dụng hỗ trợ nhiều API key. Nếu một lệnh gọi API thất bại với lỗi hết hạn mức (HTTP 429), nó sẽ không bỏ cuộc ngay. Thay vào đó, nó sẽ tự động thử lại yêu cầu với key tiếp theo trong danh sách, đảm bảo tính sẵn sàng cao hơn.

## 🚀 Hướng dẫn Bắt đầu

### Yêu cầu Hệ thống

*   **Hệ điều hành:** Windows, macOS, hoặc Linux.
*   **Node.js:** Phiên bản `v18.x` (LTS) hoặc mới hơn được khuyến nghị.
*   **npm:** `v8.x` hoặc mới hơn (thường được cài đặt cùng với Node.js).

### Quy trình Cài đặt

1.  **Sao chép Kho mã nguồn:** Mở terminal hoặc command prompt và điều hướng đến thư mục bạn muốn lưu dự án.
    ```bash
    git clone https://github.com/Junior-Frontend-dev/onluyen-electron-app.git
    cd onluyen-electron-app
    ```

2.  **Cài đặt các Gói phụ thuộc:** Lệnh này sẽ đọc file `package.json` và tải xuống tất cả các thư viện cần thiết (Electron, Axios, v.v.) vào thư mục `node_modules`.
    ```bash
    npm install
    ```

### Khởi chạy Ứng dụng

Ứng dụng cung cấp nhiều kịch bản khởi động cho các nhu cầu khác nhau:

*   **Khởi động Tiêu chuẩn:** Lựa chọn tốt nhất cho việc sử dụng hàng ngày.
    ```bash
    npm start
    ```

*   **Khởi động Nhanh:** Tùy chọn này tắt khả năng tăng tốc phần cứng của GPU. Nó có thể hữu ích trên các hệ thống cũ hơn hoặc nếu bạn gặp phải các lỗi đồ họa. Ứng dụng có thể cảm thấy kém mượt mà hơn một chút, nhưng sẽ tiêu thụ ít tài nguyên hơn.
    ```bash
    npm start-fast
    ```

*   **Khởi động Gỡ lỗi:** Bật chế độ ghi log chi tiết ra terminal. Cực kỳ hữu ích cho các nhà phát triển để theo dõi luồng thực thi của ứng dụng.
    ```bash
    npm start-debug
    ```

## ⚙️ Tùy chỉnh & Cấu hình

Bạn có toàn quyền kiểm soát các khía cạnh cốt lõi của ứng dụng. Mở file `main.js` và tìm đối tượng `mainSettings` để tinh chỉnh:

*   **`autoOpenDevConsole: boolean`**
    *   **Mặc định:** `false`
    *   **Tác dụng:** Nếu đặt thành `true`, Bảng điều khiển Dev tùy chỉnh (`F12`) sẽ tự động mở mỗi khi ứng dụng khởi động. Hữu ích cho việc gỡ lỗi liên tục.

*   **`screenshotQuality: number`**
    *   **Mặc định:** `70`
    *   **Tác dụng:** Một số từ `0` đến `100` xác định chất lượng của ảnh chụp màn hình JPEG. Giá trị cao hơn (`90-100`) tạo ra hình ảnh rõ nét hơn, giúp AI nhận dạng tốt hơn nhưng làm tăng kích thước file và có thể làm tăng chi phí/thời gian gọi API. Giá trị thấp hơn (`50-70`) giúp tiết kiệm băng thông.

*   **`domLimit: number`**
    *   **Mặc định:** `100`
    *   **Tác dụng:** Giới hạn số lượng phần tử DOM được gửi đến AI. Trên các trang rất phức tạp, việc gửi hàng nghìn phần tử có thể làm quá tải cửa sổ ngữ cảnh của AI. Giảm giá trị này nếu bạn gặp lỗi liên quan đến kích thước prompt; tăng nó nếu AI dường như bỏ lỡ các phần tử quan trọng ở cuối trang.

*   **`debugMode: boolean`**
    *   **Mặc định:** `false`
    *   **Tác dụng:** Bật/tắt đầu ra `console.log` chi tiết trong `devLog`. Bật tính năng này để có cái nhìn sâu sắc về mọi hành động mà ứng dụng đang thực hiện.

*   **`outputLanguage: string`**
    *   **Mặc định:** `'''Tiếng Việt'''`
    *   **Tác dụng:** Hướng dẫn AI ngôn ngữ nên sử dụng cho các câu trả lời và giải thích của nó. Bạn có thể thay đổi thành `'''English'''`, `'''Français'''`, v.v.

## 📦 Xây dựng và Triển khai

Ứng dụng sử dụng `electron-builder` để đóng gói thành một trình cài đặt có thể phân phối được.

1.  **Chạy kịch bản xây dựng:** Lệnh này sẽ tạo một trình cài đặt dành riêng cho hệ điều hành của bạn (ví dụ: `.exe` trên Windows) và đặt nó vào một thư mục `dist` mới.
    ```bash
    npm run build
    ```
    Hoặc cụ thể cho Windows:
    ```bash
    npm run build-win
    ```

2.  **Phân phối:** Bây giờ bạn có thể lấy trình cài đặt từ thư mục `dist` và chia sẻ nó. Người dùng có thể cài đặt ứng dụng giống như bất kỳ phần mềm nào khác mà không cần cài đặt Node.js hoặc các dependencies.

## 🗺️ Lộ trình Phát triển

Dự án này liên tục phát triển. Dưới đây là một số ý tưởng và tính năng chúng tôi đang xem xét cho tương lai:

*   [ ] **Tìm kiếm Vector cho Cơ sở Tri thức:** Thay thế tìm kiếm chuỗi đơn giản bằng một hệ thống embedding/vector để tìm các câu hỏi tương tự về mặt ngữ nghĩa, không chỉ giống hệt về mặt văn bản.
*   [ ] **Hỗ trợ Đa nền tảng Học tập:** Tạo các "adapter" hoặc "plugin" để ứng dụng có thể hoạt động trên các trang web giáo dục khác ngoài OnLuyen.vn.
*   [ ] **Giao diện Quản lý Cơ sở Tri thức:** Một giao diện người dùng để người dùng có thể duyệt, chỉnh sửa và xóa các mục trong cơ sở tri thức của họ.
*   [ ] **Fallback OCR:** Tích hợp một thư viện OCR phía máy khách (ví dụ: Tesseract.js) để trích xuất văn bản từ hình ảnh nếu snapshot DOM không thành công hoặc không có sẵn.
*   [ ] **Hệ thống Plugin:** Cho phép cộng đồng viết các plugin của riêng họ để mở rộng chức năng, chẳng hạn như thêm các loại hành động mới hoặc tích hợp với các dịch vụ của bên thứ ba.
*   [ ] **Cải thiện Giao diện Người dùng:** Nâng cấp giao diện người dùng với một framework hiện đại như React hoặc Vue để có trải nghiệm người dùng phong phú hơn.

## 🤝 Đóng góp cho Dự án

Sự đóng góp của bạn là huyết mạch của dự án mã nguồn mở. Chúng tôi hoan nghênh mọi hình thức đóng góp, từ việc sửa lỗi chính tả đến việc triển khai các tính năng cốt lõi mới.

1.  **Fork the Repository:** Tạo một bản sao của dự án về tài khoản GitHub của riêng bạn.
2.  **Create a Feature Branch:** (`git checkout -b feature/AmazingFeature`)
3.  **Commit Your Changes:** (`git commit -m 'Add some AmazingFeature'`)
4.  **Push to the Branch:** (`git push origin feature/AmazingFeature`)
5.  **Open a Pull Request:** Đi đến kho mã nguồn gốc và mở một Pull Request, mô tả chi tiết những thay đổi của bạn.

---
<div align="center">
  <em>Được chế tác với niềm đam mê dành cho học tập và công nghệ bởi Junior-Frontend-dev.</em>
</div>
