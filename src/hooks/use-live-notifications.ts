"use client";

import { useEffect } from "react";
import {
  detectLiveEvents,
  requestNotificationPermission,
  showBrowserNotification,
  type LiveEvent,
} from "@/lib/live/live-events";
import { subscribeToNotifications } from "@/lib/firebase/firestore";

export function useLiveNotifications(matchId?: string) {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const events = (e as CustomEvent<LiveEvent[]>).detail ?? [];
      for (const ev of events) {
        showBrowserNotification(ev.title, ev.body);
      }
    };
    window.addEventListener("ccpl-live-event", handler);
    return () => window.removeEventListener("ccpl-live-event", handler);
  }, []);

  useEffect(() => {
    if (!matchId) return;
    const unsub = subscribeToNotifications(matchId, (notes) => {
      const latest = notes[0];
      if (!latest) return;
      showBrowserNotification(latest.title, latest.body);
    });
    return () => unsub();
  }, [matchId]);
}
