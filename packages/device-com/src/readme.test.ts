import readme from '../README.md?raw';
import { describeDeviceReadme } from '../../../tools/readme-contract';
import { comDevice } from './logic';

describeDeviceReadme(readme, comDevice);
