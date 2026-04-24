import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ToastContainer from './ToastContainer.jsx';
import PropTypes from "prop-types";

export default function Layout(props) {
  const { children } = props;
  return (
    <div>
      <Navbar />
      {children}
      <Footer />
      <ToastContainer />
    </div>
  );
}

Layout.propTypes = {
    children: PropTypes.node.isRequired
};
