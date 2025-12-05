// src/lib/favorites.ts
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch favorite gift ids for current session user.
 * Returns array of gift_id strings.
 */
export async function fetchFavoriteGiftIds(): Promise<string[]> {
  // get session safely
  const sessionResp = await supabase.auth.getSession();
  const session = sessionResp?.data?.session;
  if (!session) return [];

  const userId = session.user.id;

  // relax typings by casting supabase to any to avoid generated types mismatch
  const sb: any = supabase as any;

  const resp: any = await sb
    .from("favorites")
    .select("gift_id")
    .eq("user_id", userId);

  if (resp?.error) {
    throw resp.error;
  }

  const data: any[] = resp?.data ?? [];
  return data.map((r: any) => r.gift_id as string);
}

/**
 * Toggle favorite for logged in user.
 * If `currentlyFavorited` is true -> deletes the favorite.
 * else -> inserts favorite row.
 */
export async function toggleFavoriteForUser(
  giftId: string,
  currentlyFavorited: boolean
): Promise<boolean> {
  // get session safely
  const sessionResp = await supabase.auth.getSession();
  const session = sessionResp?.data?.session;
  if (!session) throw new Error("Not authenticated");
  const userId = session.user.id;

  // relax typings
  const sb: any = supabase as any;

  if (currentlyFavorited) {
    // delete favorite row
    const resp: any = await sb
      .from("favorites")
      .delete()
      .match({ user_id: userId, gift_id: giftId });

    if (resp?.error) throw resp.error;
    return false;
  } else {
    // insert favorite row
    const resp: any = await sb
      .from("favorites")
      .insert({ user_id: userId, gift_id: giftId })
      .select();

    if (resp?.error) {
      // detect duplicate / unique-violation and treat as success (idempotent)
      const err = resp.error;
      const msg = String(err?.message || "").toLowerCase();
      const isDuplicate =
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        err?.code === "23505" ||
        err?.status === 409;

      if (isDuplicate) {
        return true;
      }
      throw resp.error;
    }

    return true;
  }
}
