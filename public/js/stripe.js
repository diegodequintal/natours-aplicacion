const stripe = Stripe('pk_test_mwnprq4r5KxVkjPSCi9SWpFp00QDs5SgJP');
import axios from 'axios';

export const bookTour = async tourId => {
  // 1) Get the session from the server
  try {
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);

    //2) Create cheackout form
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    showAlert('error', err);
  }
};
