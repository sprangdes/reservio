import { Link } from 'react-router-dom';
import BusinessHoursEditor from './business-hours/BusinessHoursEditor';
import SettingsInfrastructure from './SettingsInfrastructure';

export default function LegacyBusinessInfoCompatibility() {
  return <SettingsInfrastructure><main className="business-settings business-settings--legacy"><div className="business-settings__content"><p className="business-settings__legacy-note">商家資料與預約間隔已移至商家設定。服務管理仍可從原有功能使用。</p><p><Link to="/business/settings/profile">前往商家設定</Link>　<Link to="/service/manage">前往服務管理</Link></p><BusinessHoursEditor/></div></main></SettingsInfrastructure>;
}
