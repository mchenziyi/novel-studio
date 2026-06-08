// ==================== 数据校验层 ====================
// 参照 inkos 的 Zod schema 校验，对伏笔/状态数据做强制校验

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 伏笔状态校验
const VALID_HOOK_STATUSES = ['open', 'progressing', 'resolved', 'deferred'];
const VALID_HOOK_TYPES = ['planted', 'advanced', 'resolved'];

export function validateHookStatus(status: string): ValidationResult {
  if (!VALID_HOOK_STATUSES.includes(status)) {
    return { valid: false, errors: [`无效的伏笔状态: "${status}"，允许值: ${VALID_HOOK_STATUSES.join('/')}`] };
  }
  return { valid: true, errors: [] };
}

export function validateHookType(type: string): ValidationResult {
  if (!VALID_HOOK_TYPES.includes(type)) {
    return { valid: false, errors: [`无效的伏笔类型: "${type}"，允许值: ${VALID_HOOK_TYPES.join('/')}`] };
  }
  return { valid: true, errors: [] };
}

// 角色状态校验
const VALID_CHAR_STATUSES = ['alive', 'dead', 'unknown', 'injured', 'missing'];
const VALID_CHAR_ROLES = ['protagonist', 'antagonist', 'supporting', 'minor'];

export function validateCharacterStatus(status: string): ValidationResult {
  if (!VALID_CHAR_STATUSES.includes(status)) {
    return { valid: false, errors: [`无效的角色状态: "${status}"，允许值: ${VALID_CHAR_STATUSES.join('/')}`] };
  }
  return { valid: true, errors: [] };
}

export function validateCharacterRole(role: string): ValidationResult {
  if (!VALID_CHAR_ROLES.includes(role)) {
    return { valid: false, errors: [`无效的角色定位: "${role}"，允许值: ${VALID_CHAR_ROLES.join('/')}`] };
  }
  return { valid: true, errors: [] };
}

// 章节状态校验
const VALID_CHAPTER_STATUSES = ['pending', 'review', 'audit', 'synced'];

export function validateChapterStatus(status: string): ValidationResult {
  if (!VALID_CHAPTER_STATUSES.includes(status)) {
    return { valid: false, errors: [`无效的章节状态: "${status}"，允许值: ${VALID_CHAPTER_STATUSES.join('/')}`] };
  }
  return { valid: true, errors: [] };
}

// 支线状态校验
const VALID_PLOTLINE_STATUSES = ['active', 'dormant', 'resolved'];

export function validatePlotlineStatus(status: string): ValidationResult {
  if (!VALID_PLOTLINE_STATUSES.includes(status)) {
    return { valid: false, errors: [`无效的支线状态: "${status}"，允许值: ${VALID_PLOTLINE_STATUSES.join('/')}`] };
  }
  return { valid: true, errors: [] };
}

// 通用校验：非空字符串
export function validateNonEmpty(value: string, fieldName: string): ValidationResult {
  if (!value || !value.trim()) {
    return { valid: false, errors: [`${fieldName}不能为空`] };
  }
  return { valid: true, errors: [] };
}

// 通用校验：整数
export function validateInteger(value: any, fieldName: string): ValidationResult {
  if (value !== undefined && value !== null && !Number.isInteger(Number(value))) {
    return { valid: false, errors: [`${fieldName}必须是整数`] };
  }
  return { valid: true, errors: [] };
}

// 批量校验
export function validateAll(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap(r => r.errors);
  return { valid: errors.length === 0, errors };
}
