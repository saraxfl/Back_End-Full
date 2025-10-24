export class IncidentList {
  id: number;
  user_id: number | null;       
  created: string;              
  url: string | null;
  anonymous: 'Yes' | 'No';
  admin_id: number | null;
  status: string;              
  published: 'Published' | 'Unpublished';
  description: string | null;
}
