import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ToastContainer from './ToastContainer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: Readonly<LayoutProps>) {
  return (
    <div>
      <Navbar />
      {children}
      <Footer />
      <ToastContainer />
    </div>
  );
}
