export const hexToInt = (hex: string): number => {
    if (!hex) return 0;
    return parseInt(hex.replace('#', ''), 16);
};

export const intToHex = (intColor: number): string => {
    if (intColor === undefined || intColor === null) return '#000000';
    return `#${intColor.toString(16).padStart(6, '0')}`;
};
