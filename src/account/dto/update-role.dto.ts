import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '../../auth/enums/role.enum';

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'Role baru wajib ditentukan' })
  @IsEnum(Role, { message: 'Role harus salah satu dari: OWNER, FINANCE, KASIR' })
  role: Role;

  @IsOptional()
  @IsBoolean({ message: 'resetPermissions harus berupa boolean' })
  resetPermissions?: boolean;

  @IsOptional()
  @IsArray({ message: 'Permissions harus berupa array string' })
  @IsString({ each: true })
  permissions?: string[];
}
