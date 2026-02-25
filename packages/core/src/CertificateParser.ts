import type { CertificateInfo, SubjectInfo, SubjectAltName } from '@cert-manager/shared';

export class CertificateParser {
  parseOpenSSLOutput(rawOutput: string): CertificateInfo {
    const info: CertificateInfo = {
      subject: this.parseSubject(rawOutput),
      issuer: this.parseIssuer(rawOutput),
      serialNumber: this.extractSerialNumber(rawOutput),
      validFrom: this.extractDate(rawOutput, /Not Before[:\s]*(.+)/i),
      validTo: this.extractDate(rawOutput, /Not After[:\s]*(.+)/i),
      algorithm: this.extractAlgorithm(rawOutput),
      keySize: this.extractKeySize(rawOutput),
      version: this.extractVersion(rawOutput),
      isCA: this.extractIsCA(rawOutput),
      keyUsage: this.extractKeyUsage(rawOutput),
      extendedKeyUsage: this.extractExtendedKeyUsage(rawOutput),
      fingerprints: {
        sha256: '',
        sha1: '',
      },
      subjectAltNames: this.extractSubjectAltNames(rawOutput),
      rawText: rawOutput,
    };

    return info;
  }

  private parseSubject(output: string): SubjectInfo {
    // Match "Subject:" but NOT "Subject Public Key Info:" or "Subject Alternative Name:"
    // The subject line contains DN components like CN=, O=, C=, etc.
    const subjectMatch = output.match(/^\s*Subject:\s*(.+?)$/m);
    if (subjectMatch) {
      const raw = subjectMatch[1].trim();
      // Verify it looks like a DN (contains = sign)
      if (raw.includes('=')) {
        return this.parseDistinguishedName(raw);
      }
    }
    
    // Fallback: look for Subject followed by DN components
    const fallbackMatch = output.match(/Subject[:\s]+([A-Z]{1,2}\s*=\s*[^,\n]+(?:,\s*[A-Z]{1,2}\s*=\s*[^,\n]+)*)/i);
    const raw = fallbackMatch ? fallbackMatch[1].trim() : '';
    return this.parseDistinguishedName(raw);
  }

  private parseIssuer(output: string): SubjectInfo {
    // Match "Issuer:" line specifically
    const issuerMatch = output.match(/^\s*Issuer:\s*(.+?)$/m);
    if (issuerMatch) {
      const raw = issuerMatch[1].trim();
      if (raw.includes('=')) {
        return this.parseDistinguishedName(raw);
      }
    }
    
    // Fallback: look for Issuer followed by DN components
    const fallbackMatch = output.match(/Issuer[:\s]+([A-Z]{1,2}\s*=\s*[^,\n]+(?:,\s*[A-Z]{1,2}\s*=\s*[^,\n]+)*)/i);
    const raw = fallbackMatch ? fallbackMatch[1].trim() : '';
    return this.parseDistinguishedName(raw);
  }

  private parseDistinguishedName(dn: string): SubjectInfo {
    const info: SubjectInfo = { raw: dn };

    // Handle both formats: "CN=Test, O=Org" and "CN = Test / O = Org"
    const cnMatch = dn.match(/CN\s*=\s*([^,\/\n]+)/i);
    if (cnMatch) info.CN = cnMatch[1].trim();

    // Match O but not OU - use negative lookahead
    const oMatch = dn.match(/(?<![O])O\s*=\s*([^,\/\n]+)/i) || dn.match(/,\s*O\s*=\s*([^,\/\n]+)/i);
    if (oMatch) info.O = oMatch[1].trim();

    const ouMatch = dn.match(/OU\s*=\s*([^,\/\n]+)/i);
    if (ouMatch) info.OU = ouMatch[1].trim();

    const cMatch = dn.match(/(?:^|[,\/\s])C\s*=\s*([^,\/\n]+)/i);
    if (cMatch) info.C = cMatch[1].trim();

    const stMatch = dn.match(/ST\s*=\s*([^,\/\n]+)/i);
    if (stMatch) info.ST = stMatch[1].trim();

    const lMatch = dn.match(/L\s*=\s*([^,\/\n]+)/i);
    if (lMatch) info.L = lMatch[1].trim();

    const emailMatch = dn.match(/emailAddress\s*=\s*([^,\/\n]+)/i);
    if (emailMatch) info.emailAddress = emailMatch[1].trim();

    return info;
  }

  private extractSerialNumber(output: string): string {
    // Format 1: Single line "Serial Number: XX:XX:XX..."
    const singleLineMatch = output.match(/Serial Number[:\s]*([a-fA-F0-9:]+)(?:\s|$)/i);
    if (singleLineMatch) return singleLineMatch[1].trim();

    // Format 2: Multi-line with hex on next line
    const multiLineMatch = output.match(/Serial Number[:\s]*\n\s*([a-fA-F0-9:]+)/i);
    if (multiLineMatch) return multiLineMatch[1].trim();

    // Format 3: Decimal format "Serial Number: 1234567890"
    const decimalMatch = output.match(/Serial Number[:\s]*(\d+)/i);
    if (decimalMatch) return decimalMatch[1].trim();

    return '';
  }

  private extractField(output: string, regex: RegExp): string | null {
    const match = output.match(regex);
    return match ? match[1].trim() : null;
  }

  private extractDate(output: string, regex: RegExp): string {
    const match = output.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractAlgorithm(output: string): string {
    const sigAlgMatch = output.match(/Signature Algorithm[:\s]*(.+?)(?:\n|$)/i);
    if (sigAlgMatch) return sigAlgMatch[1].trim();

    const pubKeyAlgMatch = output.match(/Public Key Algorithm[:\s]*(.+?)(?:\n|$)/i);
    return pubKeyAlgMatch ? pubKeyAlgMatch[1].trim() : 'Unknown';
  }

  private extractKeySize(output: string): number {
    const rsaMatch = output.match(/RSA Public-Key[:\s]*\((\d+)\s*bit\)/i);
    if (rsaMatch) return parseInt(rsaMatch[1], 10);

    const keySizeMatch = output.match(/Public-Key[:\s]*\((\d+)\s*bit\)/i);
    if (keySizeMatch) return parseInt(keySizeMatch[1], 10);

    const ecMatch = output.match(/ASN1 OID[:\s]*(prime\d+v\d+|secp\d+[rk]\d+|P-\d+)/i);
    if (ecMatch) {
      const curve = ecMatch[1].toLowerCase();
      if (curve.includes('256') || curve === 'p-256') return 256;
      if (curve.includes('384') || curve === 'p-384') return 384;
      if (curve.includes('521') || curve === 'p-521') return 521;
    }

    return 0;
  }

  private extractVersion(output: string): number {
    // Format: "Version: 3 (0x2)" - extract the first number
    const versionMatch = output.match(/Version[:\s]*(\d+)(?:\s*\(0x\d+\))?/i);
    return versionMatch ? parseInt(versionMatch[1], 10) : 0;
  }

  private extractIsCA(output: string): boolean {
    const basicConstraints = output.match(/Basic Constraints[:\s]*[\n\s]*(.+?)(?:\n\s*\S|\n\n|$)/is);
    if (basicConstraints) {
      return /CA\s*:\s*TRUE/i.test(basicConstraints[1]);
    }
    return false;
  }

  private extractKeyUsage(output: string): string[] {
    const keyUsageMatch = output.match(/Key Usage[:\s]*[\n\s]*(.+?)(?:\n\s*\S|\n\n|$)/is);
    if (!keyUsageMatch) return [];

    const usageText = keyUsageMatch[1].trim();
    if (usageText.toLowerCase().includes('critical')) {
      const afterCritical = usageText.replace(/critical/i, '').trim();
      return afterCritical.split(/[,\n]/).map((u) => u.trim()).filter(Boolean);
    }

    return usageText.split(/[,\n]/).map((u) => u.trim()).filter(Boolean);
  }

  private extractExtendedKeyUsage(output: string): string[] {
    const ekuMatch = output.match(/Extended Key Usage[:\s]*[\n\s]*(.+?)(?:\n\s*[A-Z]|\n\n|$)/is);
    if (!ekuMatch) return [];

    const ekuText = ekuMatch[1].trim();
    const usages = ekuText.split(/[,\n]/).map((u) => u.trim()).filter(Boolean);

    return usages.map((usage) => {
      if (usage.toLowerCase().includes('critical')) {
        return usage.replace(/critical/i, '').trim();
      }
      return usage;
    }).filter(Boolean);
  }

  private extractSubjectAltNames(output: string): SubjectAltName[] {
    const sanMatch = output.match(
      /Subject Alternative Name[:\s]*[\n\s]*(.+?)(?:\n\s*[A-Z]|\n\n|$)/is
    );
    if (!sanMatch) return [];

    const sanText = sanMatch[1].trim();
    const sans: SubjectAltName[] = [];

    const dnsMatches = sanText.matchAll(/DNS[:\s]*([^\s,]+)/gi);
    for (const match of dnsMatches) {
      sans.push({ type: 'DNS', value: match[1] });
    }

    const ipMatches = sanText.matchAll(/IP(?:\s+Address)?[:\s]*([^\s,]+)/gi);
    for (const match of ipMatches) {
      sans.push({ type: 'IP', value: match[1] });
    }

    const emailMatches = sanText.matchAll(/email[:\s]*([^\s,]+)/gi);
    for (const match of emailMatches) {
      sans.push({ type: 'email', value: match[1] });
    }

    const uriMatches = sanText.matchAll(/URI[:\s]*([^\s,]+)/gi);
    for (const match of uriMatches) {
      sans.push({ type: 'URI', value: match[1] });
    }

    return sans;
  }

  parseFingerprints(sha256Output: string, sha1Output: string): { sha256: string; sha1: string } {
    const extractFingerprint = (output: string): string => {
      const match = output.match(/([A-Fa-f0-9:]{59,})/);
      return match ? match[1].toUpperCase() : '';
    };

    return {
      sha256: extractFingerprint(sha256Output),
      sha1: extractFingerprint(sha1Output),
    };
  }
}
