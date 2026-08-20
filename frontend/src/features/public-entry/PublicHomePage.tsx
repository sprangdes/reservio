import { useRef, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import CapabilityProof from './CapabilityProof';
import CustomerValue from './CustomerValue';
import FinalAudienceCTA from './FinalAudienceCTA';
import HowItWorks from './HowItWorks';
import MerchantValue from './MerchantValue';
import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';
import PublicHero from './PublicHero';
import PublicMobileMenu from './PublicMobileMenu';

export default function PublicHomePage() {
  const { me } = useAuth();
  const isCustomer = me?.role === 'ROLE_USER';
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <div className="public-entry"><div id="public-entry-content"><a className="public-entry__skip-link" href="#main-content">跳至主要內容</a><PublicHeader isCustomer={isCustomer} menuOpen={menuOpen} onOpenMenu={() => setMenuOpen(true)} triggerRef={triggerRef} /><main id="main-content"><PublicHero isCustomer={isCustomer} /><CustomerValue /><MerchantValue /><HowItWorks /><CapabilityProof /><FinalAudienceCTA isCustomer={isCustomer} /></main><PublicFooter /></div><PublicMobileMenu isCustomer={isCustomer} open={menuOpen} onClose={() => setMenuOpen(false)} triggerRef={triggerRef} /></div>;
}
