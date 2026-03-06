import { supabase } from "@/integrations/supabase/client";

type NotificationChannel = "push" | "sms" | "whatsapp" | "email";

interface SendNotificationOptions {
  userId: string;
  title: string;
  message: string;
  path?: string;
  channels?: NotificationChannel[];
  phone?: string;
  email?: string;
  emailSubject?: string;
  emailHtml?: string;
  smsTemplateId?: string;
  smsVariables?: Record<string, string>;
  whatsappTemplate?: string;
  whatsappComponents?: unknown[];
}

export async function sendMultiChannelNotification(options: SendNotificationOptions) {
  const {
    userId, title, message, path = "/notifications",
    channels = ["push"],
    phone, email,
    emailSubject, emailHtml,
    smsTemplateId, smsVariables,
    whatsappTemplate, whatsappComponents,
  } = options;

  const results: Record<string, { success: boolean; error?: string }> = {};

  // Always create in-app notification
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "system",
    title,
    message,
    path,
  });

  const promises: Promise<void>[] = [];

  if (channels.includes("push")) {
    promises.push(
      supabase.functions.invoke("send-push-notification", {
        body: { user_id: userId, title, message, path },
      }).then(({ error }) => {
        results.push = { success: !error, error: error?.message };
      })
    );
  }

  if (channels.includes("sms") && phone) {
    promises.push(
      supabase.functions.invoke("send-sms", {
        body: {
          phone,
          template_id: smsTemplateId,
          variables: smsVariables,
          message: !smsTemplateId ? `${title}: ${message}` : undefined,
        },
      }).then(({ error }) => {
        results.sms = { success: !error, error: error?.message };
      })
    );
  }

  if (channels.includes("whatsapp") && phone) {
    promises.push(
      supabase.functions.invoke("send-whatsapp", {
        body: {
          phone,
          template_name: whatsappTemplate,
          text_message: !whatsappTemplate ? `*${title}*\n${message}` : undefined,
          components: whatsappComponents,
        },
      }).then(({ error }) => {
        results.whatsapp = { success: !error, error: error?.message };
      })
    );
  }

  if (channels.includes("email") && email) {
    promises.push(
      supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: emailSubject || title,
          html: emailHtml || `<h2>${title}</h2><p>${message}</p>`,
          text: `${title}\n\n${message}`,
        },
      }).then(({ error }) => {
        results.email = { success: !error, error: error?.message };
      })
    );
  }

  await Promise.allSettled(promises);
  return results;
}
