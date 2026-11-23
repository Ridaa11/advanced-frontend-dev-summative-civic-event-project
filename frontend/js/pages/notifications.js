$(function () {
  if (!Auth.requireAuth()) return;
  Layout.init('notifications');
  Layout.mount($('#notif-page-list'));
  $('#mark-all').on('click', Layout.markAllRead);
});