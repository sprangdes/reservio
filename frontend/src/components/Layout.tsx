import type { ReactNode } from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ToastContainer from './ToastContainer.jsx';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div>
      <Navbar />
      {children}
      <Footer />
      <ToastContainer />
    </div>
  );
}
