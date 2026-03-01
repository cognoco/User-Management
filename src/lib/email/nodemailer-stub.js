// Client-side stub for nodemailer — this module should never run in the browser
module.exports = {
  createTransport: () => {
    throw new Error('nodemailer is not available on the client side');
  },
};
