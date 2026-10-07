import readme from '../README.md?raw';
import { describeDeviceReadme } from '../../../tools/readme-contract';
import { sl40Device } from './logic';

describeDeviceReadme(readme, sl40Device);
