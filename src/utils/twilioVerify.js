import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
console.log('Twilio Client Initialized:', client ? 'Success' : 'Failed');

export const twilioSendOtp = async (phone) => {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: 'sms'
      });
    return verification;
  } catch (error) {
    console.error('Twilio Send OTP Error:', error);
    throw error;
  }
};

export const twilioVerifyOtp = async (phone, code) => {
  try {
    const verification_check = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code: code
      });
    return verification_check;
  } catch (error) {
    console.error('Twilio Verify OTP Error:', error);
    throw error;
  }
};
