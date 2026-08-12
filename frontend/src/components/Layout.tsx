import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ToastContainer from './ToastContainer';

interface LayoutProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export default function Layout({ children, hideNavigation = false }: Readonly<LayoutProps>) {
  return (
    <div>
      {hideNavigation ? null : <Navbar />}
      {children}
      <Footer />
      <ToastContainer />
    </div>
  );
}
