import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login', // Si el api y el front estan en el mismo servidor, esto funciona. Sino no funciona, tendria que ponerle la url bien del api
      data: {
        email, // igual a email: email
        password
      }
    });
    // esto es para llevar a la pag de inicio al ingresar sesion
    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    });

    console.log(res);
    if (res.data.status === 'success') {
      showAlert('success', 'See you soon!');
      location.reload(true);
    }
  } catch (err) {
    showAlert('error', 'Error logging out! Try again!');
  }
};
