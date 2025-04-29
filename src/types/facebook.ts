declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export interface FacebookAccount {
  id: string;
  name: string;
  forms: FacebookForm[];
}

export interface FacebookForm {
  id: string;
  name: string;
  status: string;
}

export interface FacebookLead {
  id: string;
  formId: string;
  createdTime: string;
  fieldData: {
    name: string;
    value: string;
  }[];
}

export interface FacebookWebhookEvent {
  object: string;
  entry: {
    id: string;
    time: number;
    changes: {
      value: {
        form_id: string;
        leadgen_id: string;
        created_time: number;
        page_id: string;
      };
      field: string;
    }[];
  }[];
} 