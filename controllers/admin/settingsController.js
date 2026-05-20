const settingsService = require('../../services/settingsService');

exports.index = async (req, res, next) => {
  try {
    const settings = await settingsService.getAll();
    res.render('admin/settings', { title: 'System Settings', settings });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_from,
            ftp_host, ftp_port, ftp_user, ftp_password, ftp_path,
            ftp_poll_minutes, ny_notification_emails,
            po_image_base_url,
            company_name, address1, city, state, zip, phone,
            note01, note02, note03, note04, note05,
            note06, note07, note08, note09, note10 } = req.body;

    const pairs = {
      smtp_host, smtp_port, smtp_user, smtp_from,
      ftp_host, ftp_port, ftp_user, ftp_path,
      ftp_poll_minutes, ny_notification_emails,
      po_image_base_url,
      company_name, address1, city, state, zip, phone,
      note01, note02, note03, note04, note05,
      note06, note07, note08, note09, note10,
    };
    // Only update passwords if non-empty (allow leaving blank to keep existing)
    if (smtp_password) pairs.smtp_password = smtp_password;
    if (ftp_password)  pairs.ftp_password  = ftp_password;

    await settingsService.setMany(pairs, req.session.user.user_id);
    req.flash('success', 'Settings saved.');
    res.redirect('/admin/settings');
  } catch (err) { next(err); }
};
