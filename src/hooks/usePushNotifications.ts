import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY_STORAGE = "vapid_public_key";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported("serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  }, []);

  const requestPermission = async () => {
    if (!supported) {
      toast.error("Push notifications are not supported in this browser.");
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      await subscribeToPush();
      return true;
    } else {
      toast.error("Notification permission denied.");
      return false;
    }
  };

  const subscribeToPush = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const registration = await navigator.serviceWorker.ready;

      // Get or generate VAPID public key
      let vapidPublicKey = localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);

      if (!vapidPublicKey) {
        const { data, error } = await supabase.functions.invoke("generate-vapid-keys");
        if (error || !data?.publicKey) {
          console.error("Failed to generate VAPID keys:", error);
          return;
        }
        vapidPublicKey = data.publicKey;
        localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, vapidPublicKey!);
      }

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!),
      });

      const subscriptionJson = subscription.toJSON();

      // Save to database
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: session.user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh: subscriptionJson.keys!.p256dh!,
          auth: subscriptionJson.keys!.auth!,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) {
        console.error("Failed to save push subscription:", error);
      } else {
        toast.success("Push notifications enabled! 🔔");
      }
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  };

  return { permission, supported, requestPermission };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
