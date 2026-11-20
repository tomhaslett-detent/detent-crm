// The existing app owner was matched to the Base44 account that created Detent CRM.
const detentOwner = "6b00239c359c5eb7b1eba30e";

export function isDetentStaff(user) {
  const email = user?.email?.trim().toLowerCase();
  return user?.role === "admin" && (user.id === detentOwner || (typeof email === "string" && /^[^@\s]+@detentgtm\.io$/.test(email)));
}
