// Some bits of the HTMLDialogElement api are not generally available or functional with most browsers
// So this just encapsulated all of the uses in one place.
//

export function windowHasHTMLDialogElement(): boolean {
  return 'HTMLDialogElement' in window;
}

export function hasShowModal(dialogElement: HTMLElement) {
  const de = dialogElement as unknown as {showModal?: unknown};
  return de.showModal !== undefined && typeof(de.showModal) === 'function';
}

export function showModal(dialogElement: HTMLElement) {
  (dialogElement as unknown as {showModal?: () => void}).showModal?.();
}
