const bcrypt = require('bcryptjs');
const { sb } = require('../config/supabase');
const { success, error } = require('../utils/response');

async function registerOperator(req, res, next) {
  console.log(req.body);
  try {
    const { companyName, email, phone, address, aircraftCategory, ownerUsername, ownerPassword, ownerFullName } = req.body;
    const existing = await sb('operators').select('id').eq('email', email).run();
    if (existing && existing.length) return error(res, 'An operator with this email already exists.', 409);
    const hash = await bcrypt.hash(ownerPassword, 12);
    const opRows = await sb('operators').insert({ company_name: companyName, email, phone: phone || null, address: address || null, aircraft_category: aircraftCategory || 'fixed_wing',owner_name: ownerFullName, owner_email: email,owner_phone: phone, approval_status: 'pending' }).run();
    const operator = opRows && opRows[0];
    const userRows = await sb('operator_users').insert({ operator_id: operator.id, username: ownerUsername.toLowerCase(), password_hash: hash, full_name: ownerFullName || null, email, role: 'owner', is_active: true, is_approved: true }).run();
    const user = userRows && userRows[0];
    return success(res, { operator, user: { id: user.id, username: user.username, role: user.role } }, 201);
  } catch (err) {
    if (err.supabaseCode === '23505') return error(res, 'Username or email already taken.', 409);
    next(err);
  }
}

async function listOperators(req, res, next) {
  try {
    const { approvalStatus, limit = 50, offset = 0 } = req.query;
    let query = sb('operators').select('*').order('created_at', 'desc').limit(parseInt(limit)).offset(parseInt(offset));
    if (approvalStatus) query = query.eq('approval_status', approvalStatus);
    const rows = await query.run();
    return success(res, rows || [], 200, { total: rows ? rows.length : 0 });
  } catch (err) { next(err); }
}

async function getOperator(req, res, next) {
  try {
    const { id } = req.params;
    if (req.user.type === 'operator' && req.user.operatorId !== id) return error(res, 'Forbidden.', 403);
    const rows = await sb('operators').select('*').eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Operator not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

async function updateOperator(req, res, next) {
  try {
    const { id } = req.params;
    if (req.user.type === 'operator' && req.user.operatorId !== id) return error(res, 'Forbidden.', 403);
    const { companyName, phone, address, aircraftCategory, aopExpiryDate, aopUrl } = req.body;
    const data = {};
    if (companyName !== undefined) data.company_name = companyName;
    if (phone !== undefined) data.phone = phone;
    if (address !== undefined) data.address = address;
    if (aircraftCategory !== undefined) data.aircraft_category = aircraftCategory;
    if (aopExpiryDate !== undefined) data.aop_expiry_date = aopExpiryDate;
    if (aopUrl !== undefined) data.aop_url = aopUrl;
    const rows = await sb('operators').update(data).eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Operator not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

async function setApprovalStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) return error(res, 'Invalid approvalStatus.', 400);
    const rows = await sb('operators').update({ approval_status: approvalStatus }).eq('id', id).run();
    if (!rows || !rows.length) return error(res, 'Operator not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

async function listUsers(req, res, next) {
  try {
    const { id } = req.params;
    if (req.user.type === 'operator' && req.user.operatorId !== id) return error(res, 'Forbidden.', 403);
    const rows = await sb('operator_users').select('id,username,full_name,email,role,is_active,is_approved,last_login,created_at').eq('operator_id', id).order('created_at', 'asc').run();
    return success(res, rows || []);
  } catch (err) { next(err); }
}

async function addUser(req, res, next) {
  try {
    const { id } = req.params;
    if (req.user.type === 'operator') {
      if (req.user.operatorId !== id) return error(res, 'Forbidden.', 403);
      if (req.user.role !== 'owner') return error(res, 'Only owners can add employees.', 403);
    }
    const { username, password, fullName, email, role } = req.body;
    if (!username || !password) return error(res, 'username and password are required.', 400);
    const hash = await bcrypt.hash(password, 12);
    const rows = await sb('operator_users').insert({ operator_id: id, username: username.toLowerCase(), password_hash: hash, full_name: fullName || null, email: email || null, role: role === 'owner' ? 'owner' : 'employee', is_active: true, is_approved: false }).run();
    const user = rows && rows[0];
    return success(res, { id: user.id, username: user.username, fullName: user.full_name, email: user.email, role: user.role, isApproved: user.is_approved }, 201);
  } catch (err) {
    if (err.supabaseCode === '23505') return error(res, 'Username already taken.', 409);
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id, uid } = req.params;
    if (req.user.type === 'operator' && req.user.operatorId !== id) return error(res, 'Forbidden.', 403);
    const { isActive, isApproved, fullName, email, password } = req.body;
    const data = {};
    if (isActive !== undefined) data.is_active = !!isActive;
    if (isApproved !== undefined) data.is_approved = !!isApproved;
    if (fullName !== undefined) data.full_name = fullName;
    if (email !== undefined) data.email = email;
    if (password) data.password_hash = await bcrypt.hash(password, 12);
    const rows = await sb('operator_users').update(data).eq('id', uid).run();
    if (!rows || !rows.length) return error(res, 'User not found.', 404);
    return success(res, rows[0]);
  } catch (err) { next(err); }
}

async function removeUser(req, res, next) {
  try {
    const { id, uid } = req.params;
    if (req.user.type === 'operator') {
      if (req.user.operatorId !== id) return error(res, 'Forbidden.', 403);
      if (req.user.role !== 'owner') return error(res, 'Only owners can remove employees.', 403);
    }
    await sb('operator_users').delete().eq('id', uid).run();
    return success(res, { message: 'User removed.' });
  } catch (err) { next(err); }
}

module.exports = { registerOperator, listOperators, getOperator, updateOperator, setApprovalStatus, listUsers, addUser, updateUser, removeUser };
