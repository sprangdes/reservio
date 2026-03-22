import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ToastContainer from './ToastContainer.jsx';

export default function Layout({ children }) {
  return (
    <div>
      <Navbar />
      {children}
      <Footer />
      <ToastContainer />
    </div>
  );
}
