import readme from '../README.md?raw';
import { describeDeviceReadme } from '../../../tools/readme-contract';
import { gpsmap496Device } from './logic';

describeDeviceReadme(readme, gpsmap496Device);
