export function isReadonly(): boolean {
  return process.env.NEXT_PUBLIC_READONLY === 'true'
}
