# Vui học GDQP&AN

Trang web ôn tập và thi thử cho sinh viên. Không cần server: mở `web/index.html` bằng trình duyệt là chạy.

## Cấu trúc

```
web/
├── index.html
├── css/style.css
├── js/app.js
├── data/data.json      # cây JSON duy nhất (dễ đọc)
├── data/data.js        # cùng nội dung, để chạy trực tiếp bằng file://
├── assets/             # logo, ảnh sân trường, chuông (trích từ thư mục design)
└── audio/              # nhạc nền + nhạc kết thúc bài thi (chuyển từ /Audio sang .m4a)
tools/build_data.py     # chuyển Excel -> JSON
```

## Cập nhật câu hỏi

Sửa/thêm file `HP*/Bài n/Đề m/data.xlsx` hoặc `HP*/Thi Thử/Đề m/data.xlsx`
(cột: Question Text | Option 1..4 | Correct Answer), sau đó chạy:

```bash
pip install openpyxl
python3 tools/build_data.py
```

Thêm học phần (HP3…), bài, hay đề mới (Đề 2…) sẽ được nhận tự động.

## Tính năng

- **Luyện tập**: chấm ngay khi chọn đáp án, pháo giấy và âm thanh khi đúng, rung đỏ khi sai, nút **Đáp Án** để xem đáp án.
- **Thi thử**: chọn số câu và thời gian, đề ngẫu nhiên, đồng hồ đếm ngược, hết giờ thì chuông reo; có xem lại bài sau khi nộp.
- Thứ tự phương án được trộn mỗi lần làm (dữ liệu gốc luôn để đáp án đúng ở vị trí 1). Câu có phương án kiểu "Cả A và C" giữ nguyên thứ tự; câu có phương án "Tất cả đều đúng" thì phương án đó luôn nằm cuối.
- Lưu điểm cao nhất từng bài trên trình duyệt (localStorage).
- Phím tắt: `A–D`/`1–4` chọn đáp án · `←/→` chuyển câu · `Space` xem đáp án · `M` bật/tắt nhạc · `Esc` quay lại.
- Trên điện thoại có thể vuốt trái/phải để chuyển câu.
