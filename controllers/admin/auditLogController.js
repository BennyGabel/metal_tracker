const { AuditLog, User } = require('../../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

exports.index = async (req, res, next) => {
  try {
    const { user_id, action_type, entity_type, from_date, to_date } = req.query;
    const where = {};
    if (user_id) where.user_id = user_id;
    if (action_type) where.action_type = action_type;
    if (entity_type) where.entity_type = entity_type;
    if (from_date && to_date) where.created_at = { [Op.between]: [new Date(from_date), new Date(to_date + 'T23:59:59')] };

    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['first_name','last_name'] }],
      order: [['created_at', 'DESC']],
      limit, offset,
    });

    const users = await User.findAll({ attributes: ['user_id','first_name','last_name'], order: [['last_name','ASC']] });

    res.render('admin/auditLog', {
      title: 'Audit Log',
      logs: rows, count, page, limit,
      totalPages: Math.ceil(count / limit),
      filters: req.query, users,
    });
  } catch (err) { next(err); }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const logs = await AuditLog.findAll({
      include: [{ model: User, as: 'user', attributes: ['first_name','last_name'] }],
      order: [['created_at','DESC']],
      limit: 10000,
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Audit Log');
    ws.columns = [
      { header: 'Date/Time', key: 'dt', width: 22 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'Action', key: 'action', width: 22 },
      { header: 'Entity Type', key: 'etype', width: 20 },
      { header: 'Entity ID', key: 'eid', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'IP', key: 'ip', width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const log of logs) {
      ws.addRow({
        dt: log.created_at,
        user: log.user ? `${log.user.first_name} ${log.user.last_name}` : 'System',
        action: log.action_type,
        etype: log.entity_type,
        eid: log.entity_id || '',
        notes: log.notes || '',
        ip: log.ip_address || '',
      });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_log.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};
