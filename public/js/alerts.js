export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};
// type es 'success' o 'error'
export const showAlert = (type, msg) => {
  hideAlert();

  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterBegin', markup);

  window.setTimeout(hideAlert, 5000);
};
