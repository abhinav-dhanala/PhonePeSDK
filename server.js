const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import the components
const createUserSubscription = require('./components/create_user_subscription');
const submitAuthReq = require('./components/submit_auth_req');
const authReqStatus = require('./components/auth_req_status');
const recurringNotification = require('./components/recurring_notification');
const recurringDebitExec = require('./components/recurring_debit_exec');
const recurringDebitStatus = require('./components/recurring_debit_status');
const revokeSub = require('./components/revoke_sub');
const userSubscriptionStatus = require('./components/user_subscription_status');
const verifyVPA = require('./components/verify_vpa');
const recurringInit = require('./components/recurring_init');
const callbackRevoke = require('./components/callback_revoke');
const cancelSubscription = require('./components/cancel_subscription'); // Import the cancel subscription component

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(bodyParser.json());
app.use(cors());
app.use(morgan('tiny'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

app.use(limiter);

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.use('/subscription', createUserSubscription);
app.use('/auth', submitAuthReq);
app.use('/auth/status', authReqStatus);
app.use('/notifications', recurringNotification);
app.use('/recurring', recurringDebitExec);
app.use('/recurring/status', recurringDebitStatus);
app.use('/subscription/revoke', revokeSub);
app.use('/subscription/status', userSubscriptionStatus);
app.use('/vpa/verify', verifyVPA);
app.use('/recurring/init', recurringInit);
app.use('/callback/revoke', callbackRevoke);

// Use the cancel subscription component
app.use('/subscription/cancel', cancelSubscription);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//this is my server.js