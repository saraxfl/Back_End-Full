export class UserResponseDto {
  id: number;
  email: string;
  is_admin: boolean | 0 | 1 ;
  user_status: 'active' | 'banned' | 'suspended' | 'pending';  // String union type
}
