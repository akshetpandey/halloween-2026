import Foundation
import Vision

// macOS verification adapter; never prints the decoded bearer URL.
let expected = CommandLine.arguments[1]
var matches: [Bool] = []
for path in CommandLine.arguments.dropFirst(2) {
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    try VNImageRequestHandler(url: URL(fileURLWithPath: path)).perform([request])
    matches.append(request.results?.contains { $0.payloadStringValue == expected } ?? false)
}
print(String(data: try JSONEncoder().encode(matches), encoding: .utf8)!)
