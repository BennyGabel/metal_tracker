require('dotenv').config();
const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');

const sessionMiddleware = require('./config/session');
const csrfMiddleware = require('./middleware/csrf');
const { requireLogin } = require('./middleware/auth');
const routes = require('./routes');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Method override for PUT/DELETE in HTML forms
app.use(methodOverride('_method'));

// Session
app.use(sessionMiddleware);

// Flash messages
app.use(flash());

// CSRF
app.use(csrfMiddleware);

// Inject flash + user into every view
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.user || null;
  next();
});

// Routes
app.use('/', routes);

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'Page not found.',
    currentUser: req.session?.user || null,
    csrfToken:   req.session?.csrfToken || '',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Server Error',
    message: err.status === 403 ? err.message : 'An unexpected error occurred.',
    currentUser: req.session?.user || null,
    csrfToken:   req.session?.csrfToken || '',
  });
});

module.exports = app;
