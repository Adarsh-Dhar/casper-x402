"""Small smoke test for parse_deploy_hash helper in deploy_nuclear.py
This script simulates several casper-client outputs and prints parsing results.
"""
from deploy_nuclear import parse_deploy_hash, DeploymentConfig

cases = [
    ("Deploy submitted. Deploy hash: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", None),
    ("{\"deploy_hash\": \"abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef\"}", None),
    ("Some output with account hash 0202742321905bbc93ab2bcc0505b207e31180cbae251c48ee95246b44ee832df271 and then deploy 1111111111111111111111111111111111111111111111111111111111111111", ['recipient:account_hash="0202742321905bbc93ab2bcc0505b207e31180cbae251c48ee95246b44ee832df271"']),
    ("No hash here, only an error: MissingArgument [2] - details", None),
]

cfg = DeploymentConfig()
for out, session_args in cases:
    if session_args:
        cfg.session_args = session_args
    else:
        cfg.session_args = []
    res = parse_deploy_hash(out, cfg, None, None)
    print('\nINPUT:\n', out)
    print('RESULT: ', res)

