import { Router, Request, Response } from 'express';
import { EventList } from '../src/app/types/eventstype';
import { events } from '../src/app/datas/events';
const router = Router();

// [GET] Lấy danh sách tất cả sự kiện
router.get('/', (req: Request, res: Response) => {
  res.json({ success: true, data: events });
});

// [POST] Tạo mới 1 sự kiện
router.post('/', (req: Request, res: Response) => {
  // Lấy data từ body
  const {
    name,
    description,
    date_time,
    location,
    image_url,
    price,
    currency,
    discount,
    organizer,
    tags,
    event_type,
    ticket_link,
    max_attendees
  } = req.body;

  // Kiểm tra các trường bắt buộc
  if (!name || !date_time || !location || !organizer) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu trường bắt buộc (name, date_time, location, organizer)'
    });
  }

  // Tự sinh ID mới (VD: max ID + 1)
  const newId = events.length > 0 ? Math.max(...events.map(e => e.id)) + 1 : 1;

  // Tạo đối tượng sự kiện mới
  const newEvent: EventList = {
    id: newId,
    name,
    description: description || '',
    date_time,
    location,
    image_url: image_url || '',
    price: price !== undefined ? price : null,
    currency: currency || 'USD',
    discount,
    organizer,
    tags: tags || [],
    event_type: event_type || 'offline',
    ticket_link,
    max_attendees,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Thêm vào mảng
  events.push(newEvent);

  // Trả về JSON
  res.status(201).json({
    success: true,
    data: newEvent
  });
});

// ... Các route khác (GET /:id, PUT /:id, DELETE /:id) ...

export default router;
