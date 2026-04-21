import type { HostBooking } from "@/types/host";
import type { Conversation, Message } from "@/types/listing";

/** Mapuje odpowiedź BookingDetailSerializer na HostBooking (gość opcjonalny w API). */
export function mapBookingToHostBooking(raw: Record<string, unknown>): HostBooking {
  const listingRaw = raw.listing as Record<string, unknown> | undefined;
  const guestRaw = raw.guest as Record<string, unknown> | undefined;
  const listing = {
    id: String(listingRaw?.id ?? raw.listing_id ?? ""),
    slug: String(listingRaw?.slug ?? raw.listing_slug ?? ""),
    title: String(listingRaw?.title ?? raw.listing_title ?? "Oferta"),
  };
  const guest = guestRaw
    ? {
        id: String(guestRaw.id ?? ""),
        first_name: String(guestRaw.first_name ?? "Gość"),
        last_name: String(guestRaw.last_name ?? ""),
        avatar_url: (guestRaw.avatar_url as string | null) ?? null,
      }
    : {
        id: "guest",
        first_name: "Gość",
        last_name: "",
        avatar_url: null as string | null,
      };

  return {
    id: String(raw.id),
    conversation_id: raw.conversation_id != null ? String(raw.conversation_id) : null,
    listing,
    guest,
    check_in: String(raw.check_in ?? ""),
    check_out: String(raw.check_out ?? ""),
    guests_count: Number(raw.guests_count ?? 1),
    adults: Number(raw.adults ?? 1),
    status: raw.status as HostBooking["status"],
    final_amount: Number(raw.final_amount ?? 0),
    currency: String(raw.currency ?? "PLN"),
    special_requests: String(raw.special_requests ?? ""),
    created_at: String(raw.created_at ?? ""),
  };
}

export function mapApiConversation(raw: Record<string, unknown>): Conversation {
  const lastRaw = raw.last_message as Record<string, unknown> | null | undefined;
  const conversationId = String(raw.id);
  return {
    id: conversationId,
    listing: {
      id: String(raw.listing_id ?? ""),
      title: String(raw.listing_title ?? "Oferta"),
      slug: String(raw.listing_slug ?? ""),
    },
    guest: {
      id: String(raw.guest_id ?? ""),
      first_name: String(raw.guest_first_name ?? "Gość"),
      last_name: String(raw.guest_last_name ?? ""),
      avatar_url: (raw.guest_avatar_url as string | null) ?? null,
    },
    host: {
      id: String(raw.host_id ?? ""),
      display_name: String(raw.host_display_name ?? ""),
      avatar_url: (raw.host_avatar_url as string | null) ?? null,
    },
    last_message: lastRaw ? mapApiMessage(lastRaw, conversationId) : null,
    unread_count: Number(raw.unread_count ?? 0),
    related_booking: (raw.related_booking as Conversation["related_booking"]) ?? null,
    created_at: String(raw.created_at ?? raw.updated_at ?? ""),
  };
}

export function mapApiMessage(
  raw: Record<string, unknown>,
  conversationId: string
): Message {
  const body = raw.body ?? raw.content;
  return {
    id: String(raw.id),
    conversation_id: conversationId,
    sender_id: String(raw.sender_id ?? ""),
    content: String(body ?? ""),
    is_read: raw.read_at != null || raw.is_read === true,
    created_at: String(raw.created_at ?? ""),
  };
}
