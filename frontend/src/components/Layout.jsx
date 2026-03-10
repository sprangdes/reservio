import { useEffect } from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ToastContainer from './ToastContainer.jsx';

export default function Layout({ children, transparentNavbar }) {
  useEffect(() => {
    if (transparentNavbar) {
      document.body.classList.add('index-page');
    } else {
      document.body.classList.remove('index-page');
    }
    return () => document.body.classList.remove('index-page');
  }, [transparentNavbar]);

  return (
    <div>
      <Navbar transparent={transparentNavbar} />
      {children}
      <Footer />
      <ToastContainer />
    </div>
  );
}
