import readme from '../README.md?raw';
import { describeDeviceReadme } from '../../../tools/readme-contract';
import { gtx327Device } from './logic';

describeDeviceReadme(readme, gtx327Device);
