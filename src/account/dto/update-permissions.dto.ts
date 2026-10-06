import { IsArray, IsString } from 'class-validator';

export class UpdatePermissionsDto {
  @IsArray({ message: 'Permissions harus berupa array string kode fitur' })
  @IsString({ each: true, message: 'Setiap permission harus berupa string' })
  permissions: string[];
}
