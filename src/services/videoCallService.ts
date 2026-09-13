import axios from "axios";
import { prisma } from "../config/prisma";

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_BASE = "https://api.daily.co/v1";

export async function createCallRoom(bookingId: string): Promise<string> {
  const response = await axios.post(
    `${DAILY_API_BASE}/rooms`,
    {
      properties: {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4, // room expires 4 hours after creation
        enable_screenshare: true,
        enable_chat: true,
      },
    },
    { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } }
  );

  const roomUrl = response.data.url;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { callRoomUrl: roomUrl },
  });

  return roomUrl;
}