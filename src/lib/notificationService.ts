export interface SmsAlertSettings {
  isSmsEnabled: boolean;
  targetNumber: string;
  alertCarUploads: boolean;
  alertStaffLogs: boolean;
  alertCarExpirations: boolean;
  alertBuyerLeads: boolean;
  webhookEnabled?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface SmsAlertItem {
  id: string;
  type: "carUpload" | "staffLog" | "carExpired" | "buyerLead" | "testSms";
  title: string;
  message: string;
  targetNumber: string;
  timestamp: string;
  status: "sent" | "logged";
  metadata?: Record<string, any>;
}

const DEFAULT_SMS_SETTINGS: SmsAlertSettings = {
  isSmsEnabled: false,
  targetNumber: "",
  alertCarUploads: false,
  alertStaffLogs: false,
  alertCarExpirations: false,
  alertBuyerLeads: false,
  webhookEnabled: false,
  webhookUrl: "",
  webhookSecret: ""
};

export function getSmsSettings(): SmsAlertSettings {
  return { ...DEFAULT_SMS_SETTINGS };
}

export function saveSmsSettingsLocally(settings: Partial<SmsAlertSettings>): SmsAlertSettings {
  return { ...DEFAULT_SMS_SETTINGS, ...settings, isSmsEnabled: false };
}

export async function syncSmsSettingsToFirestore(_settings: SmsAlertSettings): Promise<void> {
  // SMS alert functionality disabled and removed per user request
}

export async function dispatchAdminSmsAlert(
  _type: SmsAlertItem["type"],
  _title: string,
  _message: string,
  _metadata?: Record<string, any>
): Promise<SmsAlertItem | null> {
  // SMS alert functionality disabled and removed per user request
  return null;
}

export async function testWebhookDispatch(_url: string, _secret?: string): Promise<boolean> {
  return false;
}

export async function fetchSmsHistory(): Promise<SmsAlertItem[]> {
  return [];
}
